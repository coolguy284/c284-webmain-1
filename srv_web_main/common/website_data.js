module.exports = new Proxy(
  require('./website_data_parse')(),
  {
    get(target, prop, recv) {
      return prop in target ? target[prop] : prop == '__target' ? target : 0;
    }
  }
);
