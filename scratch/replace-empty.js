const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Power\\Desktop\\Crafit-LatestCode\\craftit-main\\app';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Admin style empty states (div with py-16)
  content = content.replace(
    /<div className="py-16 text-center text-slate-500 text-sm">\s*No [a-zA-Z]+ found\s*<\/div>/g, 
    '<GlobalNoResults />'
  );

  // 2. Admin style empty states with FiAlertCircle
  content = content.replace(
    /<div className="py-20 flex flex-col items-center justify-center">\s*<div className="w-16 h-16[^>]*>\s*<FiAlertCircle[^>]*\/>\s*<\/div>\s*<p className="text-slate-400 text-sm font-medium">No [a-zA-Z]+ found\.?<\/p>\s*<\/div>/g, 
    '<GlobalNoResults />'
  );

  // 3. Manufacturer simple <p> empty states
  content = content.replace(
    /<p className="text-slate-500 font-medium">No [a-zA-Z]+ found<\/p>/g,
    '<GlobalNoResults />'
  );
  content = content.replace(
    /<p className="text-gray-600 font-semibold">No [a-zA-Z]+ found<\/p>/g,
    '<GlobalNoResults />'
  );
  content = content.replace(
    /<p className="text-gray-500">No [a-zA-Z]+ found<\/p>/g,
    '<GlobalNoResults />'
  );
  content = content.replace(
    /<p className="text-sm">No transactions found\.<\/p>/g,
    '<GlobalNoResults />'
  );
  
  // 4. Notifications
  content = content.replace(
    /<p className="text-lg font-bold text-white">No notifications yet<\/p>/g,
    '<GlobalNoResults />'
  );
  content = content.replace(
    /<p className="text-gray-500 font-medium">No notifications yet<\/p>/g,
    '<GlobalNoResults />'
  );

  // 5. Customer Orders massive block (we replace just the icon and title, keep the description and button)
  content = content.replace(
    /<div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center[^>]*>[\s\S]*?<\/div>\s*<h3 className="mb-2 text-xl font-black text-white">\s*No orders found\s*<\/h3>/g,
    '<GlobalNoResults />'
  );
  
  // 6. Customer Explore empty state
  content = content.replace(
    /<div className="py-20 text-center">\s*<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white\/5 text-white\/40">\s*<span className="material-symbols-outlined text-3xl">search_off<\/span>\s*<\/div>\s*<h3 className="mb-2 text-xl font-black text-white">No products found<\/h3>\s*<p className="text-sm text-white\/50">[^<]*<\/p>\s*<\/div>/g,
    '<GlobalNoResults />'
  );

  // 7. Admin Support
  content = content.replace(
    /<div className="py-16 text-center text-slate-500 text-sm">\s*No tickets found matching your criteria\s*<\/div>/g,
    '<GlobalNoResults />'
  );

  if (content !== originalContent) {
    if (!content.includes('import GlobalNoResults')) {
      const importStatement = `import GlobalNoResults from "@/components/GlobalNoResults";\n`;
      if (/^["']use client["'];/m.test(content)) {
        content = content.replace(/^(["']use client["'];\s*\n)/m, `$1${importStatement}`);
      } else if (content.startsWith('//')) {
        content = content.replace(/^(\/\/[^\n]*\n)(["']use client["'];\s*\n)?/m, `$1$2${importStatement}`);
      } else {
        content = importStatement + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
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
