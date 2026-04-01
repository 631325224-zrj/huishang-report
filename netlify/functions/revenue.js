// Netlify Function: 实时拉取徽商故里营收数据
const https = require('https');

const APP_ID = '2f30be60293b4f8e8d82dbc272418ba9';
const ACCESS_ID = '1d2297864eda4f6db7a00b04260c18db';
const CENTER_ID = 247412;

// 封装 HTTPS 请求
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON parse error: ' + raw)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 获取 token
async function getToken() {
  const url = `https://cysms.wuuxiang.com/api/auth/accesstoken?appid=${APP_ID}&accessid=${ACCESS_ID}&response_type=token`;
  const res = await httpPost(url, {});
  return res.access_token;
}

// 查询某月数据
async function fetchMonth(token, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  const res = await httpPost('https://cysms.wuuxiang.com/api/datatransfer/getBusinessSituation', {
    centerId: CENTER_ID,
    startDate,
    endDate,
    token,
  });
  return res?.data?.List || [];
}

// 门店区域映射
const REGION_MAP = {
  '北京': ['北京光熙门店','北京望京店','北京颐提港店'],
  '合肥': ['合肥万象城店','合肥万达店','合肥银泰店','合肥庐州府店','合肥滨湖吾悦店','合肥中环城店','合肥大悦城店','合肥融创茂店'],
  '黄山': ['黄山屯溪老街店','黄山老街徽府店','黄山万达店','黄山迎客松店'],
  '皖北': ['亳州万达店','宿州万达店','阜阳吾悦店','淮北吾悦店','蚌埠吾悦店','淮南吾悦店'],
  '浙沪': ['上海七宝万科店','杭州西溪印象城店','宁波万象城店','温州印象城店'],
  '其他': ['芜湖吾悦店','铜陵吾悦店','安庆吾悦店','马鞍山吾悦店','滁州吾悦店','池州九华天街店','宣城吾悦店','六安吾悦店'],
};

function getRegion(shopName) {
  for (const [region, shops] of Object.entries(REGION_MAP)) {
    if (shops.some(s => shopName.includes(s) || s.includes(shopName))) return region;
  }
  return '其他';
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const token = await getToken();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const today = now.toISOString().slice(0, 10);

    // 拉取从2025年5月到当前月的所有数据
    const allMonthData = {}; // key: "YYYY-MM"

    // 确定需要拉取的年月范围
    const months = [];
    for (let y = 2025; y <= curYear; y++) {
      const startM = (y === 2025) ? 5 : 1;
      const endM = (y === curYear) ? curMonth : 12;
      for (let m = startM; m <= endM; m++) {
        months.push({ year: y, month: m });
      }
    }

    // 今日数据
    const todayRes = await httpPost('https://cysms.wuuxiang.com/api/datatransfer/getBusinessSituation', {
      centerId: CENTER_ID,
      startDate: today,
      endDate: today,
      token,
    });
    const todayList = todayRes?.data?.List || [];

    // 并行拉取所有月份（限制并发）
    const batchSize = 4;
    for (let i = 0; i < months.length; i += batchSize) {
      const batch = months.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(({ year, month }) => fetchMonth(token, year, month)));
      batch.forEach(({ year, month }, idx) => {
        allMonthData[`${year}-${String(month).padStart(2, '0')}`] = results[idx];
      });
    }

    // 整理门店列表（从当前月数据中提取）
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const shopSet = new Map();

    // 收集所有出现过的门店
    for (const list of Object.values(allMonthData)) {
      for (const item of list) {
        const bd = item?.businessData;
        if (!bd) continue;
        const name = bd.name || item.name || '';
        if (name && !shopSet.has(name)) {
          shopSet.set(name, { name, region: getRegion(name) });
        }
      }
    }

    const allShops = Array.from(shopSet.values());

    // 按月汇总各门店营收
    const monthlyRevenue = {}; // key: shopName -> { "YYYY-MM": amount }
    for (const [monthKey, list] of Object.entries(allMonthData)) {
      for (const item of list) {
        const bd = item?.businessData;
        if (!bd) continue;
        const name = bd.name || item.name || '';
        const amount = parseFloat(bd.orig || 0) / 10000;
        if (!name) continue;
        if (!monthlyRevenue[name]) monthlyRevenue[name] = {};
        monthlyRevenue[name][monthKey] = (monthlyRevenue[name][monthKey] || 0) + amount;
      }
    }

    // 今日营收
    const todayRevenue = {};
    for (const item of todayList) {
      const bd = item?.businessData;
      if (!bd) continue;
      const name = bd.name || item.name || '';
      const amount = parseFloat(bd.orig || 0) / 10000;
      if (name) todayRevenue[name] = (todayRevenue[name] || 0) + amount;
    }

    // 可用年份列表
    const availableYears = [...new Set(months.map(m => m.year))].sort();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        generatedAt: now.toISOString(),
        today,
        curYear,
        curMonth,
        availableYears,
        allShops,
        monthlyRevenue,
        todayRevenue,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
