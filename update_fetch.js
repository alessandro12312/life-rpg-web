const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/web/src/app/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('fetch(') || content.includes('fetch(`http')) {
    // Aggiungi la chiamata a supabase se non c'è, o la dichiarazione getToken
    let lines = content.split('\n');
    let output = [];
    
    // We will do replacements manually to be safer instead of a blanket regex wrapper
    // Actually regex is fine for adding headers.
  }
});
