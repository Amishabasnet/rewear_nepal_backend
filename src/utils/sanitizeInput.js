const xss = require('xss');

const stripHtml = (value) =>
  xss(value, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });

const sanitizePlainText = (value) => {
  if (typeof value !== 'string') return value;
  return stripHtml(value).trim();
};

module.exports = { stripHtml, sanitizePlainText };
