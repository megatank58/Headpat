
const theme = localStorage.getItem("theme") || 'dark-mode';
const link = document.getElementById('themeLink');

link.href = `/resource/${theme}.css`;