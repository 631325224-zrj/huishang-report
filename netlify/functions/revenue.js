// Netlify Function: 实时拉取徽商故里营收数据
// 收银系统API文档: https://doc.wuuxiang.com/showdoc/web/#/46/460
const https = require('https');

const APP_ID = '2f30be60293b4f8e8d82dbc272418ba9';
const ACCESS_ID = '1d2297864eda4f6db7a00b04260c18db';
const CENTER_ID = 247412; // 集团ID
const SYSTEM_ONLINE_YEAR = 2025;
const SYSTEM_ONLINE_MONTH = 6; // 6月初上线

// ── HTTPS 请求 ─────────────────────────────────────────────────
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON parse error: ' + raw)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── 获取 Token ────────────────────────────────────────────────
async function getToken() {
  const url = `https://cysms.wuuxiang.com/api/auth/accesstoken?appid=${APP_ID}&accessid=${ACCESS_ID}&response_type=token`;
  const options = {
    hostname: 'cysms.wuuxiang.com',
    path: '/api/auth/accesstoken?appid=' + APP_ID + '&accessid=' + ACCESS_ID + '&response_type=token',
    method: 'POST',
    headers: { 'Content-Length': 0 }
  };
  const res = await httpRequest(options, '');
  if (!res.access_token) throw new Error('获取Token失败: ' + JSON.stringify(res));
  return res.access_token;
}

// ── 查询营收数据 ────────────────────────────────────────────────
// dateType: 'day' | 'month' | 'year'
// settleDate: 'YYYY-MM-DD' (day) | 'YYYY-MM' (month) | 'YYYY' (year)
async function queryRevenue(token, settleDate, dateType) {
  const qs = `centerId=${CENTER_ID}&settleDate=${settleDate}&dateType=${dateType}`;
  const options = {
    hostname: 'cysms.wuuxiang.com',
    path: '/api/datatransfer/getBusinessSituation?' + qs,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0,
      'access_token': token,
      'accessid': ACCESS_ID,
      'granttype': 'client'
    }
  };
  return await httpRequest(options, '');
}

// ── 门店区域映射（基于导出数据-机构信息202604021314.xlsx）─────────
const STORE_REGION_MAP = {
  // 北京区域
  '徽商故里朝阳门店': '北京',
  '徽商故里三里河店': '北京',
  '徽商故里广安门店': '北京',
  '徽商故里元大都店': '北京',
  '徽商故里双井店': '北京',
  // 华北天津/济南
  '徽商故里天津店': '华北',
  '徽商故里济南店': '华北',
  // 合肥区域
  '徽商故里罍街店': '合肥',
  '徽商故里大蜀山店': '合肥',
  '徽商故里贡街店': '合肥',
  '徽商故里小馆店': '合肥',
  '徽商故里水西门店': '合肥',
  '徽商故里芜湖店': '合肥',
  '徽商故里骆岗店': '合肥',
  '徽商故里云城里店': '合肥',
  '徽商故里繁昌店': '合肥',
  // 皖北
  '徽商故里蚌埠店': '皖北',
  '徽商故里滁州店': '皖北',
  '徽商故里阜阳店': '皖北',
  '徽商故里六安店': '皖北',
  '徽商故里淮南店': '皖北',
  // 浙沪
  '徽商故里虹桥店': '浙沪',
  '徽商故里陆家嘴店': '浙沪',
  '徽商故里宁波店': '浙沪',
  '徽商故里杭州店': '浙沪',
  '徽商故里昆山店': '浙沪',
  // 其他
  '徽商故里仙人洞店': '黄山',
  '徽商故里深圳店': '华南',
  '徽商故里虚拟总部店': '其他',
};

const REGIONS = ['北京', '华北', '合肥', '皖北', '浙沪', '黄山', '华南', '其他'];

function getRegion(shopName) {
  return STORE_REGION_MAP[shopName] || '其他';
}

// ── 生成日期序列 ───────────────────────────────────────────────
function generateMonthRange(startYear, startMonth, endYear, endMonth) {
  const months = [];
  for (let y = startYear; y <= endYear; y++) {
    const sm = y === startYear ? startMonth : 1;
    const em = y === endYear ? endMonth : 12;
    for (let m = sm; m <= em; m++) {
      months.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` });
    }
  }
  return months;
}

// ── 主函数 ─────────────────────────────────────────────────────
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
    const curDay = now.getDate();
    const today = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;

    // 确定数据范围：2025年6月上线 → 至今
    const months = generateMonthRange(SYSTEM_ONLINE_YEAR, SYSTEM_ONLINE_MONTH, curYear, curMonth);

    // ── 1. 拉取每日数据（过去90天）─────────────────────────────
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dailyData = {};

    const days90 = [];
    for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      days90.push(ds);
    }

    console.log('拉取日数据: ' + days90.length + '天');
    for (const day of days90) {
      const res = await queryRevenue(token, day, 'day');
      const orig = res?.data?.List?.businessData?.orig || 0;
      dailyData[day] = parseFloat(orig) / 10000; // 转为万元
      await new Promise(r => setTimeout(r, 150));
    }

    // ── 2. 拉取每月数据 ─────────────────────────────────────────
    const monthlyData = {};
    console.log('拉取月数据: ' + months.length + '个月');
    for (const { key } of months) {
      const [y, m] = key.split('-');
      const res = await queryRevenue(token, `${y}-${m}`, 'month');
      const orig = res?.data?.List?.businessData?.orig || 0;
      monthlyData[key] = parseFloat(orig) / 10000;
      await new Promise(r => setTimeout(r, 150));
    }

    // ── 3. 拉取每年数据 ─────────────────────────────────────────
    const years = [...new Set(months.map(m => m.year))];
    const yearlyData = {};
    console.log('拉取年数据: ' + years.length + '年');
    for (const year of years) {
      const res = await queryRevenue(token, String(year), 'year');
      const orig = res?.data?.List?.businessData?.orig || 0;
      yearlyData[String(year)] = parseFloat(orig) / 10000;
      await new Promise(r => setTimeout(r, 150));
    }

    // ── 4. 构建门店列表 ─────────────────────────────────────────
    const allShops = Object.keys(STORE_REGION_MAP).map(name => ({
      name,
      region: getRegion(name),
      centerId: null // 暂不支持单店查询
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        generatedAt: now.toISOString(),
        today,
        curYear,
        curMonth,
        curDay,
        availableYears: years,
        availableMonths: months.map(m => m.key),
        allShops,
        dailyData,    // { 'YYYY-MM-DD': 万元 }
        monthlyData,  // { 'YYYY-MM': 万元 }
        yearlyData,   // { 'YYYY': 万元 }
        // 汇总（集团总营收）
        summary: {
          today: dailyData[today] || 0,
          currentMonth: monthlyData[`${curYear}-${String(curMonth).padStart(2,'0')}`] || 0,
          currentYear: yearlyData[String(curYear)] || 0,
          lastMonthKey: curMonth === 1
            ? `${curYear-1}-12`
            : `${curYear}-${String(curMonth-1).padStart(2,'0')}`,
          lastYear: String(curYear - 1),
        },
        apiStatus: {
          tokenOk: !!token,
          monthsWithData: Object.entries(monthlyData).filter(([,v]) => v > 0).length,
          daysWithData: Object.entries(dailyData).filter(([,v]) => v > 0).length,
        }
      }),
    };
  } catch (err) {
    console.error('API Error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        generatedAt: new Date().toISOString(),
        error: err.message,
        // 返回空数据结构，前端降级显示
        allShops: Object.keys(STORE_REGION_MAP).map(name => ({
          name,
          region: getRegion(name),
          centerId: null
        })),
        dailyData: {},
        monthlyData: {},
        yearlyData: {},
        summary: { today: 0, currentMonth: 0, currentYear: 0, lastMonthKey: '', lastYear: '' },
        apiStatus: { tokenOk: false, monthsWithData: 0, daysWithData: 0 },
      }),
    };
  }
};
