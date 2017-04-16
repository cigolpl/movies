//var render = nunjucks.renderString('Hello {{ username }}', { username: 'James' });
//var env = nunjucks.configure('views', { autoescape: true });
//var env = nunjucks.configure({ autoescape: true });
//var env = new nunjucks.Environment();
//var loader = new nunjucks.PrecompiledLoader(templates);
//var env = new nunjucks.Environment([loader]);
//var env = new nunjucks.Environment(new nunjucks.WebLoader('views'))
var filters = function(env) {
  env.addFilter('sortObject', function(array, field, order) {
    return _.chain(array)
    .cloneDeep()
    .map(function(val, key) {
      val.key = key
      return val
    })
    .sortBy([function(o) {
      if (order === 'asc') {
        return o[field]
      }
      return -o[field]
    }])
    .value();
  })
  env.addGlobal('in_array', function(element, array) {
    array = array || [];
    return array.indexOf(element) !== -1;
  })
  env.addFilter('ceil', function(str) {
    return Math.ceil(str)
  })
  env.addFilter('build', function(str, data) {
    var url = new URI(str || '');
    var search = url.search(true);
    url.search(_.extend(search, data));
    return url.normalizeQuery().toString();
  })
}
var env = nunjucks.configure({ autoescape: true });
//var env = nunjucks.configure('/views', { autoescape: true });

filters(env);

itemsjs = itemsjs(items, search_config);

var requestCatalog = function(data) {

  History.pushState(null, document.title, decodeURIComponent(data.url));

  var queries = URI(data.url).search(true)
  if (queries.filters) {
    queries.filters = JSON.parse(queries.filters);
  }

  var filters = queries.filters;
  var result = itemsjs.search(queries);

  var render = nunjucks.render('views/catalog.html.twig', {
    items: result.data.items,
    website: website_config,
    pagination: result.pagination,
    page: 1,
    is_ajax: true,
    aggregations: result.data.aggregations,
    filters: filters,

  });

  jQuery("#content").html(render);

  /*data = _.extend({
    success: function(result, status) {
      jQuery("#content").html(result);
    },
    dataType: 'html'
  }, data);
  jQuery.ajax(data);*/
}


var onAggregationClick = function(element, aggregation, value) {
  var checked = jQuery(element).is(':checked');
  var uri = getUpdatedAggregationsUrl({
    key: aggregation,
    value: value,
    checked: checked
  });

  requestCatalog({
    url: uri.href()
  });
}



var removeFilter = function(key, value) {
  var uri = getUpdatedAggregationsUrl({
    key: key,
    value: value,
    checked: false
  });
  requestCatalog({
    url: uri.href()
  });
  //window.location.href = uri.href();
}

var getUpdatedAggregationsUrl = function(options) {
  var uri = options.uri || new URI();
  var qs = uri.search(true);
  console.log(qs.filters);
  var filters = JSON.parse(qs.filters || '{}');



  var aggregation = options.key;
  var value = options.value;
  var checked = options.checked;

  if (!filters[aggregation]) {
    filters[aggregation] = [];
  }

  var chunks = uri.directory().split('/');
  if (chunks.length > 2 && chunks[1] === 'filter') {
    if (typeof globalconfig != 'undefined' && globalconfig.filter) {
      filters[globalconfig.filter.key] = [globalconfig.filter.val]
    } else {
      filters[chunks[2]] = [];
      filters[chunks[2]].push(decodeURIComponent(uri.filename()))
    }
  }

  if (uri.path() !== '/catalog' && uri.path() !== '/') {
    uri.path('/catalog');
  }

  if (checked === true) {
    filters[aggregation].push(value)
    filters[aggregation] = _.uniq(filters[aggregation]);
  } else {
    var index = filters[aggregation].indexOf(value);
    filters[aggregation].splice(index, 1);
  }

  qs.filters = JSON.stringify(filters);
  delete qs['page'];
  uri.search(qs);
  return uri;
}

jQuery(document).ready(function() {
  $('.previous-page').on('click', function(event) {
    History.back()
    event.preventDefault()
  })

  $('#main_query').keyup(function() {
    var uri = URI();

    uri.removeSearch('query');
    uri.addSearch('query', $(this).val());

    requestCatalog({
      url: uri.href()
    });
  });
})
