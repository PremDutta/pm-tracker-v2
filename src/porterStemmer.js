// Vendored from the `stemmer` npm package (MIT) instead of installed as a
// dependency — that package is pure ESM, which Jest's default config (baked
// into react-scripts, not safely overridable without risking the rest of the
// test setup) can't transform from node_modules. Copying this small,
// dependency-free file into our own src/ sidesteps that entirely, since Jest
// already transforms everything under src/ regardless of module syntax.
//
// (The MIT License)
// Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com>
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const step2list = {
  ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize',
  bli: 'ble', alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous',
  ization: 'ize', ation: 'ate', ator: 'ate', alism: 'al', iveness: 'ive',
  fulness: 'ful', ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble', logi: 'log',
};

const step3list = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' };

const consonant = '[^aeiou]';
const vowel = '[aeiouy]';
const consonants = '(' + consonant + '[^aeiouy]*)';
const vowels = '(' + vowel + '[aeiou]*)';

const gt0 = new RegExp('^' + consonants + '?' + vowels + consonants);
const eq1 = new RegExp('^' + consonants + '?' + vowels + consonants + vowels + '?$');
const gt1 = new RegExp('^' + consonants + '?(' + vowels + consonants + '){2,}');
const vowelInStem = new RegExp('^' + consonants + '?' + vowel);
const consonantLike = new RegExp('^' + consonants + vowel + '[^aeiouwxy]$');

const sfxLl = /ll$/;
const sfxE = /^(.+?)e$/;
const sfxY = /^(.+?)y$/;
const sfxIon = /^(.+?(s|t))(ion)$/;
const sfxEdOrIng = /^(.+?)(ed|ing)$/;
const sfxAtOrBlOrIz = /(at|bl|iz)$/;
const sfxEED = /^(.+?)eed$/;
const sfxS = /^.+?[^s]s$/;
const sfxSsesOrIes = /^.+?(ss|i)es$/;
const sfxMultiConsonantLike = /([^aeiouylsz])\1$/;
const step2 = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
const step3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
const step4 = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;

// Porter Stemmer — reduces a word to its root ("managing"/"managed"/"manages"
// all become "manag") so keyword matching isn't fooled by verb tense/plurals.
export function stemmer(value) {
  let result = String(value).toLowerCase();
  if (result.length < 3) return result;

  let firstCharacterWasLowerCaseY = false;
  if (result.codePointAt(0) === 121) { // lowercase 'y'
    firstCharacterWasLowerCaseY = true;
    result = 'Y' + result.slice(1);
  }

  if (sfxSsesOrIes.test(result)) result = result.slice(0, -2);
  else if (sfxS.test(result)) result = result.slice(0, -1);

  let match;
  if ((match = sfxEED.exec(result))) {
    if (gt0.test(match[1])) result = result.slice(0, -1);
  } else if ((match = sfxEdOrIng.exec(result)) && vowelInStem.test(match[1])) {
    result = match[1];
    if (sfxAtOrBlOrIz.test(result)) result += 'e';
    else if (sfxMultiConsonantLike.test(result)) result = result.slice(0, -1);
    else if (consonantLike.test(result)) result += 'e';
  }

  if ((match = sfxY.exec(result)) && vowelInStem.test(match[1])) result = match[1] + 'i';

  if ((match = step2.exec(result)) && gt0.test(match[1])) result = match[1] + step2list[match[2]];
  if ((match = step3.exec(result)) && gt0.test(match[1])) result = match[1] + step3list[match[2]];

  if ((match = step4.exec(result))) {
    if (gt1.test(match[1])) result = match[1];
  } else if ((match = sfxIon.exec(result)) && gt1.test(match[1])) {
    result = match[1];
  }

  if ((match = sfxE.exec(result)) && (gt1.test(match[1]) || (eq1.test(match[1]) && !consonantLike.test(match[1])))) {
    result = match[1];
  }

  if (sfxLl.test(result) && gt1.test(result)) result = result.slice(0, -1);

  if (firstCharacterWasLowerCaseY) result = 'y' + result.slice(1);

  return result;
}
