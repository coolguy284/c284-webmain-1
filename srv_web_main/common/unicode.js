var fs = require('fs');

var unicodeMap, unicodeRanges, validNonRangeChars;

if (fs.existsSync('websites/public/data/UnicodeData.txt')) {
  var fetchedUnicodeArr = fs.readFileSync('websites/public/data/UnicodeData.txt')
    .toString().trim().split('\n').map(x => x.split(';'));
  
  unicodeMap = new Map();
  unicodeRanges = [];
  validNonRangeChars = [];
  
  for (var i = 0; i < fetchedUnicodeArr.length; i++) {
    if (fetchedUnicodeArr[i][1].endsWith('First>')) {
      unicodeRanges.push([
        parseInt(fetchedUnicodeArr[i][0], 16),
        parseInt(fetchedUnicodeArr[i + 1][0], 16),
        fetchedUnicodeArr[i][1].split(',')[0].slice(1),
        fetchedUnicodeArr[i].slice(2),
      ]);
      i++;
    } else {
      let charIndex = parseInt(fetchedUnicodeArr[i][0], 16);
      unicodeMap.set(charIndex, fetchedUnicodeArr[i].slice(1));
      validNonRangeChars.push(charIndex);
    }
  }
} else {
  unicodeMap = null;
  unicodeRanges = [];
  validNonRangeChars = [];
}

function getEntry(codePoint) {
  if (!unicodeMap) return ['NULL', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  
  if (typeof codePoint == 'string') codePoint = parseInt(codePoint, 16);
  
  let entry = unicodeMap.get(codePoint);
  if (entry) return entry;
  
  let index = unicodeRanges.findIndex(x => codePoint >= x[0] && codePoint <= x[1]);
  if (index > -1) {
    let range = unicodeRanges[index];
    let fancyCodePoint = codePoint.toString(16).toUpperCase().padStart(4, '0');
    return [range[2] + '-' + fancyCodePoint, ...range[3]];
  }
  
  return ['UNASSIGNED', '', '', '', '', '', '', '', '', '', '', '', '', ''];
}

module.exports = {
  categoryAbbr: {
    'Lu' :	'Letter, Uppercase',
    'Ll' :	'Letter, Lowercase',
    'Lt' :	'Letter, Titlecase',
    'Mn' :	'Mark, Non-Spacing',
    'Mc' :	'Mark, Spacing Combining',
    'Me' :	'Mark, Enclosing',
    'Nd' :	'Number, Decimal Digit',
    'Nl' :	'Number, Letter',
    'No' :	'Number, Other',
    'Zs' :	'Separator, Space',
    'Zl' :	'Separator, Line',
    'Zp' :	'Separator, Paragraph',
    'Cc' :	'Other, Control',
    'Cf' :	'Other, Format',
    'Cs' :	'Other, Surrogate',
    'Co' :	'Other, Private Use',
    'Cn' :	'Other, Not Assigned', // (no characters in the file have this property)
    
    'Lm' :	'Letter, Modifier',
    'Lo' :	'Letter, Other',
    'Pc' :	'Punctuation, Connector',
    'Pd' :	'Punctuation, Dash',
    'Ps' :	'Punctuation, Open',
    'Pe' :	'Punctuation, Close',
    'Pi' :	'Punctuation, Initial quote', // (may behave like Ps or Pe depending on usage)
    'Pf' :	'Punctuation, Final quote', // (may behave like Ps or Pe depending on usage)
    'Po' :	'Punctuation, Other',
    'Sm' :	'Symbol, Math',
    'Sc' :	'Symbol, Currency',
    'Sk' :	'Symbol, Modifier',
    'So' :	'Symbol, Other',
  },
  unicodeMap,
  unicodeRanges,
  validNonRangeChars,
  getEntry,
};
