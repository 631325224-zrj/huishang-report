// Netlify Function: 实时拉取徽商故里营收数据（优化版）
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
        catch (e) { resolve({ error: 'JSON parse error', raw: raw.slice(0, 100) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

// ── 获取 Token ────────────────────────────────────────────────
async function getToken() {
  const options = {
    hostname: 'cysms.wuuxiang.com',
    path: '/api/auth/accesstoken?appid=' + APP_ID + '&accessid=' + ACCESS_ID + '&response_type=token',
    method: 'POST',
    headers: { 'Content-Length': 0 }
  };
  const res = await httpRequest(options, '');
  return res.access_token || null;
}

// ── 查询单条营收数据 ───────────────────────────────────────────
async function queryRevenue(token, settleDate, dateType) {
  const qs = 'centerId=' + CENTER_ID + '&settleDate=' + settleDate + '&dateType=' + dateType;
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
  const res = await httpRequest(options, '');
  const orig = res?.data?.List?.businessData?.orig;
  return { settleDate, dateType, orig: parseFloat(orig) || 0, code: res.code };
}

// ── 并发请求控制（最多同时N个）─────────────────────────────────
async function concurrentMap(tasks, concurrency = 5) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(t => t()));
    results.push(...batchResults);
  }
  return results;
}

// ── 门店区域映射（基于导出数据-机构信息202604021314.xlsx）─────────
const STORE_REGION_MAP = {
  '徽商故里朝阳门店':  { region: '北京',   centerId: 247413 },
  '徽商故里三里河店':  { region: '北京',   centerId: 247414 },
  '徽商故里广安门店':  { region: '北京',   centerId: 247415 },
  '徽商故里元大都店':  { region: '北京',   centerId: 247416 },
  '徽商故里双井店':    { region: '北京',   centerId: 247417 },
  '徽商故里天津店':    { region: '华北',   centerId: 247418 },
  '徽商故里济南店':    { region: '华北',   centerId: 247419 },
  '徽商故里罍街店':    { region: '合肥',   centerId: 247420 },
  '徽商故里大蜀山店':  { region: '合肥',   centerId: 247421 },
  '徽商故里贡街店':    { region: '合肥',   centerId: 247422 },
  '徽商故里小馆店':    { region: '合肥',   centerId: 247423 },
  '徽商故里水西门店':  { region: '合肥',   centerId: 247424 },
  '徽商故里芜湖店':    { region: '合肥',   centerId: 247425 },
  '徽商故里骆岗店':    { region: '合肥',   centerId: 247426 },
  '徽商故里云城里店':  { region: '合肥',   centerId: 247427 },
  '徽商故里繁昌店':    { region: '合肥',   centerId: 247428 },
  '徽商故里虹桥店':    { region: '浙沪',   centerId: 247429 },
  '徽商故里陆家嘴店':  { region: '浙沪',   centerId: 247430 },
  '徽商故里宁波店':    { region: '浙沪',   centerId: 247431 },
  '徽商故里杭州店':    { region: '浙沪',   centerId: 247432 },
  '徽商故里昆山店':    { region: '浙沪',   centerId: 247433 },
  '徽商故里蚌埠店':    { region: '皖北',   centerId: 247434 },
  '徽商故里滁州店':    { region: '皖北',   centerId: 247435 },
  '徽商故里阜阳店':    { region: '皖北',   centerId: 247436 },
  '徽商故里六安店':    { region: '皖北',   centerId: 247437 },
  '徽商故里淮南店':    { region: '皖北',   centerId: 247438 },
  '徽商故里仙人洞店':  { region: '黄山',   centerId: 247439 },
  '徽商故里深圳店':    { region: '华南',   centerId: 247440 },
};

// ── 生成日期序列 ───────────────────────────────────────────────
function generateDateRange(start, end) {
  const dates = [];
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function pad(n) { return String(n).padStart(2, '0'); }

// 生成 YYYY-MM-DD 格式的月初（用于 dateType=month）
function monthFirst(year, month) {
  return `${year}-${pad(month)}-01`;
}

// 生成 YYYY-MM-DD 格式的年初（用于 dateType=year）
function yearFirst(year) {
  return `${year}-01-01`;
}

function generateMonthRange(startYear, startMonth, endYear, endMonth) {
  const months = [];
  for (let y = startYear; y <= endYear; y++) {
    const sm = y === startYear ? startMonth : 1;
    const em = y === endYear ? endMonth : 12;
    for (let m = sm; m <= em; m++) {
      const key = `${y}-${pad(m)}`;
      months.push({ year: y, month: m, key, settleDate: monthFirst(y, m) });
    }
  }
  return months;
}

// ── 主函数 ─────────────────────────────────────────────────────
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  // ── 健康检查端点 ──────────────────────────────────────────────
  if (event.path === '/health' || event.queryStringParameters?.check === '1') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ts: new Date().toISOString() }) };
  }

  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();
    const today = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;

    // ── 1. 获取 Token ───────────────────────────────────────────
    const token = await getToken();
    if (!token) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '无法获取API Token', allShops: buildShopList(), summary: {} }) };
    }

    // ── 2. 生成需要查询的日期列表 ───────────────────────────────
    const months = generateMonthRange(SYSTEM_ONLINE_YEAR, SYSTEM_ONLINE_MONTH, curYear, curMonth);
    const years = [...new Set(months.map(m => m.year))];

    // 过去30天（日报数据）
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyDates = generateDateRange(thirtyDaysAgo, now);

    // 过去12个月（月报数据）
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const recentMonths = generateMonthRange(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + 1, curYear, curMonth);

    console.log(`[revenue] Token: OK | 日:${dailyDates.length}天 月:${recentMonths.length}月 年:${years.length}年`);

    // ── 3. 并发拉取日数据 ────────────────────────────────────────
    const dailyData = {};
    const dailyTasks = dailyDates.map(date => () => queryRevenue(token, date, 'day'));
    const dailyResults = await concurrentMap(dailyTasks, 8); // 8个并发
    dailyResults.forEach(r => { dailyData[r.settleDate] = r.orig / 10000; });

    // ── 4. 并发拉取月数据（settleDate 用月初 YYYY-MM-01）──────────
    const monthlyData = {};
    const monthlyTasks = recentMonths.map(m => () => queryRevenue(token, m.settleDate, 'month'));
    const monthlyResults = await concurrentMap(monthlyTasks, 8);
    monthlyResults.forEach(r => { monthlyData[r.settleDate.slice(0,7)] = r.orig / 10000; });

    // ── 5. 并发拉取年数据（settleDate 用年初 YYYY-01-01）──────────
    const yearlyData = {};
    const yearlyTasks = years.map(y => () => queryRevenue(token, yearFirst(y), 'year'));
    const yearlyResults = await concurrentMap(yearlyTasks, 8);
    yearlyResults.forEach(r => { yearlyData[r.settleDate.slice(0,4)] = r.orig / 10000; });

    // ── 6. 统计 ─────────────────────────────────────────────────
    const monthsWithData = Object.entries(monthlyData).filter(([, v]) => v > 0).length;
    const daysWithData = Object.entries(dailyData).filter(([, v]) => v > 0).length;
    const currentMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const lastMonthKey = curMonth === 1
      ? `${curYear - 1}-12`
      : `${curYear}-${String(curMonth - 1).padStart(2, '0')}`;

    const result = {
      success: true,
      generatedAt: now.toISOString(),
      today,
      curYear, curMonth, curDay,
      availableYears: years,
      availableMonths: months.map(m => m.key),
      dailyDates,   // 可用的日报日期范围
      allShops: buildShopList(),
      dailyData,
      monthlyData,
      yearlyData,
      summary: {
        today: dailyData[today] || 0,
        currentMonth: monthlyData[currentMonthKey] || 0,
        currentYear: yearlyData[String(curYear)] || 0,
        lastMonthKey,
        lastYear: String(curYear - 1),
      },
      apiStatus: {
        tokenOk: !!token,
        monthsWithData,
        daysWithData,
        totalDailyCalls: dailyDates.length,
        totalMonthlyCalls: recentMonths.length,
        totalYearlyCalls: years.length,
      }
    };

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('[revenue] Error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message,
        generatedAt: new Date().toISOString(),
        allShops: buildShopList(),
        dailyData: {},
        monthlyData: {},
        yearlyData: {},
        summary: { today: 0, currentMonth: 0, currentYear: 0 },
        apiStatus: { tokenOk: false, monthsWithData: 0, daysWithData: 0 },
      }),
    };
  }
};

function buildShopList() {
  return Object.entries(STORE_REGION_MAP).map(([name, info]) => ({
    name,
    region: info.region,
    centerId: info.centerId,
  }));
}
