const rp = require('request-promise-native')
const cheerio = require('cheerio')

module.exports = ({ baseUrl }) => {
  const get = (uri, qs) => rp({ uri, method: 'GET', json: true, baseUrl, qs })
  const get$ = (uri, qs) => rp({ uri, method: 'GET', json: true, baseUrl, qs }).then(body => cheerio.load(body))
  const post = (uri, form) => rp({ uri, method: 'POST', json: true, form, baseUrl })
  const del = (uri, form) => rp({ uri, method: 'DELETE', json: true, form, baseUrl })

  return {get, get$, post, del}
}
