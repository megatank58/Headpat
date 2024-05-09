const theme = localStorage.getItem("theme") || 'dark';
const link = document.getElementById('themeLink');

link.href = `/resource/${theme}-theme.css`;