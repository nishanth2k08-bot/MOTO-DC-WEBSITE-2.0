// MotoDC: Native React pagination is active in main.jsx and Admin.jsx.
// This file is retained as an inert stub to ensure zero interference.
(()=>{
  // Clean up any legacy external pagination DOM if present
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.productPagination:not([data-owner])').forEach(n => n.remove());
  });
})();
