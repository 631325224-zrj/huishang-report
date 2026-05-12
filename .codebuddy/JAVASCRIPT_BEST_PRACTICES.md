# JavaScript 最佳实践手册

> 团队代码标准参考
> 版本：v1.0 | 日期：2026-05-12

---

## 一、变量与命名

### 1.1 变量声明

```javascript
// ✅ 优先使用 const
const MAX_RETRY = 3;
const config = {};

// ✅ 需要重新赋值时使用 let
let count = 0;
count++;

// ❌ 避免使用 var（函数作用域，容易出错）
var oldStyle = 'deprecated';
```

### 1.2 命名规范

```javascript
// 变量：名词，camelCase
const userName = '张三';
const isLoading = true;
const itemList = [];

// 常量：全大写 + 下划线
const API_BASE_URL = 'https://api.example.com';
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// 函数：动词前缀 + camelCase
function getUserInfo(id) { }
function validateInput(data) { }
function handleClick(event) { }
function fetchData(url) { }

// 类/构造函数：PascalCase
class UserService { }
class DataProcessor { }

// 私有变量：下划线前缀
class Cache {
  constructor() {
    this._cacheMap = new Map();
  }
}
```

---

## 二、函数设计

### 2.1 函数长度

**规则**：每个函数不超过 50 行

```javascript
// ❌ 过长函数
function processUserData(user) {
  // 100+ 行代码...
}

// ✅ 拆分为多个小函数
function processUserData(user) {
  const validated = validateUser(user);
  const normalized = normalizeData(validated);
  const saved = saveToDatabase(normalized);
  return formatResponse(saved);
}

function validateUser(user) {
  if (!user.id) throw new Error('User ID required');
  if (!user.name) throw new Error('User name required');
  return user;
}
```

### 2.2 箭头函数

```javascript
// ✅ 简洁箭头函数
const double = (n) => n * 2;
const sum = (a, b) => a + b;

// ✅ 单行箭头函数
const users = data.map(item => ({ ...item, id: item._id }));

// ✅ 多行箭头函数（需要括号）
const processData = (data) => {
  const validated = validate(data);
  return transform(validated);
};

// ❌ 避免过长箭头函数
const complex = (a, b, c, d, e, f) => {
  // 复杂逻辑...
};
```

### 2.3 参数处理

```javascript
// ✅ 参数默认值
function createUser(name, age = 18, role = 'user') {
  return { name, age, role };
}

// ✅ 参数对象（超过 3 个参数时）
function createOrder({ productId, quantity, price, address, note }) {
  // 处理逻辑
}

createOrder({
  productId: '123',
  quantity: 2,
  price: 99,
  address: '北京市朝阳区',
  note: '尽快发货'
});

// ✅ 参数校验
function divide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Parameters must be numbers');
  }
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}
```

---

## 三、异步编程

### 3.1 Promise 处理

```javascript
// ✅ Promise 链完整
fetchData()
  .then(processResult)
  .catch(handleError)
  .finally(cleanup);

// ✅ async/await（推荐）
async function loadUserData(id) {
  try {
    const user = await fetchUser(id);
    const orders = await fetchOrders(user.id);
    return { user, orders };
  } catch (error) {
    logger.error('Failed to load user data', { id, error });
    throw error;
  }
}

// ✅ 并发请求
async function loadDashboardData() {
  const [users, products, orders] = await Promise.all([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);
  return { users, products, orders };
}

// ✅ 并发请求 + 错误处理
async function loadWithPartialSuccess() {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);
  
  return {
    users: results[0].status === 'fulfilled' ? results[0].value : null,
    products: results[1].status === 'fulfilled' ? results[1].value : null,
    orders: results[2].status === 'fulfilled' ? results[2].value : null
  };
}
```

### 3.2 常见错误

```javascript
// ❌ 忘记处理 rejection
Promise.resolve(doSomething())
  .then(handleSuccess);
// 如果 doSomething 失败，永远不会处理

// ✅ 正确处理
Promise.resolve(doSomething())
  .then(handleSuccess)
  .catch(handleError); // 不要省略

// ❌ async 函数中的未处理错误
async function process() {
  const data = await fetchData(); // 如果失败，不会被捕获
}

// ✅ 正确处理
async function process() {
  try {
    const data = await fetchData();
    return processData(data);
  } catch (error) {
    handleError(error);
    return defaultValue;
  }
}

// ❌ 不要吞掉错误
async function bad() {
  try {
    await doSomething();
  } catch (e) {
    // 空catch块 - 错误被静默忽略
  }
}

// ✅ 如果真的不需要处理，至少记录日志
async function good() {
  try {
    await doSomething();
  } catch (e) {
    console.warn('Optional operation failed:', e.message);
  }
}
```

---

## 四、DOM 操作

### 4.1 批量 DOM 操作

```javascript
// ❌ 低效：频繁 reflow
elements.forEach(el => {
  el.style.width = '100px';
  el.style.height = '50px';
  document.body.appendChild(el);
});

// ✅ 高效：使用 DocumentFragment
const fragment = document.createDocumentFragment();
elements.forEach(el => {
  el.style.width = '100px';
  el.style.height = '50px';
  fragment.appendChild(el);
});
document.body.appendChild(fragment);

// ✅ 一次性修改样式
element.classList.add('active', 'highlighted');
element.classList.remove('disabled');
```

### 4.2 事件处理

```javascript
// ✅ 事件委托（减少监听器数量）
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleItemClick(e.target);
  }
});

// ✅ 及时移除监听器
class Widget {
  constructor() {
    this.boundHandler = this.handleClick.bind(this);
    document.addEventListener('click', this.boundHandler);
  }
  
  destroy() {
    document.removeEventListener('click', this.boundHandler);
  }
}

// ✅ 防抖
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ✅ 节流
function throttle(fn, limit) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

---

## 五、数据处理

### 5.1 数组操作

```javascript
// ✅ 链式操作
const result = data
  .filter(item => item.active)
  .map(item => item.value)
  .reduce((sum, val) => sum + val, 0);

// ✅ 避免副作用
const sorted = [...data].sort((a, b) => a - b);

// ✅ 安全地处理 undefined/null
const value = optionalValue ?? defaultValue;
const name = user?.profile?.name ?? 'Anonymous';
```

### 5.2 对象操作

```javascript
// ✅ 解构赋值
const { id, name, email } = user;
const { data: items = [] } = response;

// ✅ 对象扩展
const updated = {
  ...original,
  name: 'new name',
  timestamp: Date.now()
};

// ✅ 条件属性
const user = {
  name: '张三',
  ...(age && { age }), // 只在有值时添加
  ...(vip && { vipLevel: 'gold' })
};
```

---

## 六、错误处理

### 6.1 错误类型

```javascript
// ✅ 自定义错误类
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
  }
}

// ✅ 正确使用错误
function validateInput(data) {
  if (!data.name) {
    throw new ValidationError('Name is required', 'name');
  }
  if (data.age < 0 || data.age > 150) {
    throw new ValidationError('Invalid age', 'age');
  }
}
```

### 6.2 统一错误处理

```javascript
// ✅ API 错误处理
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new ApiError(data.message, data.code);
    }
    
    return data.data;
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    // 未知错误，包装后重新抛出
    throw new Error(`Request failed: ${error.message}`);
  }
}
```

---

## 七、性能优化

### 7.1 避免内存泄漏

```javascript
// ❌ 常见内存泄漏
function bad() {
  const largeData = new Array(10000).fill({});
  setInterval(() => {
    // 一直引用 largeData
    console.log(largeData.length);
  }, 1000);
}

// ✅ 及时清理
class Manager {
  constructor() {
    this.data = [];
    this.handler = () => this.process();
    window.addEventListener('resize', this.handler);
  }
  
  destroy() {
    window.removeEventListener('resize', this.handler);
    this.data = null;
  }
}
```

### 7.2 懒加载

```javascript
// ✅ 图片懒加载
const lazyLoadImage = (img) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  observer.observe(img);
};

// ✅ 路由懒加载
const Dashboard = () => import('./views/Dashboard.vue');
const router = [
  { path: '/dashboard', component: Dashboard }
];
```

---

## 八、代码注释

### 8.1 JSDoc 注释

```javascript
/**
 * 计算订单总金额
 * @param {Array<OrderItem>} items - 订单项列表
 * @param {Object} options - 计算选项
 * @param {boolean} options.includeTax - 是否包含税费
 * @param {boolean} options.includeDiscount - 是否应用折扣
 * @returns {number} 订单总金额
 * @throws {ValidationError} 当订单项为空时抛出
 * 
 * @example
 * const total = calculateOrderTotal(items, {
 *   includeTax: true,
 *   includeDiscount: true
 * });
 */
function calculateOrderTotal(items, options = {}) {
  // 实现...
}
```

### 8.2 业务注释

```javascript
// 业务规则注释
// 根据业务规则：会员等级 >= 3 才能享受折扣
if (user.level >= 3) {
  total *= 0.9;
}

// 重要决策说明
// 选择 localStorage 而不是 sessionStorage，因为需要跨页面共享
const STORAGE_KEY = 'user_preferences';

// TODO 和 FIXME
// TODO: 后续优化为批量接口
// FIXME: 暂时用同步方式，等后端支持后再改
```

---

## 九、测试意识

### 9.1 测试原则

```javascript
// ✅ 可测试的代码
function calculateDiscount(price, userLevel) {
  if (userLevel >= 3) {
    return price * 0.9;
  }
  return price;
}

// 对应的测试
describe('calculateDiscount', () => {
  it('普通会员无折扣', () => {
    expect(calculateDiscount(100, 1)).toBe(100);
  });
  
  it('VIP会员享9折', () => {
    expect(calculateDiscount(100, 3)).toBe(90);
  });
});
```

---

## 十、安全注意事项

### 10.1 XSS 防护

```javascript
// ❌ 危险
element.innerHTML = userInput;

// ✅ 安全
element.textContent = userInput;

// ✅ 需要 HTML 时，使用转义
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

### 10.2 数据验证

```javascript
// ✅ 输入验证
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // 移除危险字符
    .trim()
    .slice(0, 1000); // 限制长度
}

// ✅ 类型检查
function processData(data) {
  if (!data || typeof data !== 'object') {
    throw new TypeError('Expected object');
  }
  // 处理...
}
```

---

*本手册由 Senior Engineer 维护*
*最后更新：2026-05-12*
