/* Client-side replacement for the WordPress search box on the Build Wiki and
 * Prompt Library index pages. The pages already list every child item as
 * <li> entries inside .ae-resource-list, so we just filter those in place
 * instead of submitting a query to a (now non-existent) WP search backend. */
(function () {
  document.querySelectorAll('form.ae-resource-search').forEach(function (form) {
    var input = form.querySelector('input[type="search"], input[name="s"]');
    if (!input) return;
    var scope = form.closest('.ae-resource-docs') || document;
    var items = Array.prototype.slice.call(scope.querySelectorAll('.ae-resource-list > li'));

    function apply() {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (li) {
        var match = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
        li.style.display = match ? '' : 'none';
      });
      // Hide a list block entirely when none of its items match.
      scope.querySelectorAll('.ae-resource-list').forEach(function (ul) {
        var anyVisible = Array.prototype.some.call(ul.children, function (c) { return c.style.display !== 'none'; });
        ul.style.display = anyVisible ? '' : 'none';
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    input.addEventListener('input', apply);
    input.setAttribute('autocomplete', 'off');
  });
})();
