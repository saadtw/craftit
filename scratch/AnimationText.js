const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Power\\Desktop\\Crafit-LatestCode\\craftit-main\\app';

const resourceMap = {
  'admin/orders': 'No orders found',
  'admin/users': 'No users found',
  'admin/disputes': 'No disputes found',
  'customer/notifications': 'No notifications yet',
  'customer/orders': 'No orders found',
  'manufacturer/bids': 'No bids found',
  'manufacturer/disputes': 'No disputes found',
  'manufacturer/financial': 'No transactions found',
  'manufacturer/notifications': 'No notifications yet',
  'manufacturer/orders': 'No orders found',
  'manufacturer/products': 'No products found',
  'manufacturers/page': 'No manufacturers found'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Determine resource type based on file path
  let text = 'No results found'; // default
  for (const [key, value] of Object.entries(resourceMap)) {
    // Replace backslashes with forward slashes for matching
    if (filePath.replace(/\\/g, '/').includes(key)) {
      text = value;
      break;
    }
  }

  // Find `<GlobalNoResults />` and replace with `<GlobalNoResults text="[text]" />`
  // We only replace if it doesn't already have a text prop
  content = content.replace(/<GlobalNoResults \/>/g, `<GlobalNoResults text="${text}" />`);

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath} with text="${text}"`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

walkDir(projectRoot);
console.log("Done.");
