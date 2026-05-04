const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\Power\\Desktop\\Crafit-LatestCode\\craftit-main\\app';

// This regex attempts to find standard empty state containers that contain an icon and text
// like: <div className="py-20..."><div...><FiAlertCircle /></div><p>No disputes found.</p></div>
// or just simple <p>No orders found</p>
// We will simply replace any text that says "No [word] found" with <GlobalNoResults /> 
// if it's not a tiny inline text.

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace common empty blocks like <div className="py-16 text-center..."><FiAlertCircle />...No [word] found...</div>
  // This regex matches a div that contains "No [word] (found|yet)" inside it, up to 300 chars long.
  // It's safer to just replace `<p className="...">No [word] found</p>` with `<GlobalNoResults />`.
  
  // Pattern 1: <p className="...">No XYZ found</p>
  content = content.replace(/<p[^>]*>\s*No\s+[a-zA-Z]+\s+(found|yet|available|to\s+display)\.?\s*<\/p>/g, '<GlobalNoResults />');
  
  // Pattern 2: <div className="...">No XYZ found</div>
  content = content.replace(/<div[^>]*>\s*No\s+[a-zA-Z]+\s+(found|yet|available|to\s+display)\.?\s*<\/div>/g, '<GlobalNoResults />');
  
  // Pattern 3: Raw text: No XYZ found inside ternary or plain text (not in quotes)
  // Be careful not to replace string literals like "No reviews yet". We only want JSX text nodes.
  // We can look for > No XYZ found <
  content = content.replace(/>\s*No\s+[a-zA-Z]+\s+(found|yet|available|to\s+display)\.?\s*</g, '><GlobalNoResults /><');

  if (content !== originalContent) {
    // Add import if not exists
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
