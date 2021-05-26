module.exports = new Proxy(
  require('./websitedataparse')(),
  {
    get(target, prop, recv) {
      return prop in target ? target[prop] : prop == '__target' ? target : 0;
    }
  }
);
