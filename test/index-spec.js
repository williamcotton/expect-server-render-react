const test = require('tape')
const React = require('react')
const express = require('express')
const ejs = require('ejs')

const serverRenderReact = require('../src')

const g = (path, cb) => [path, cb]

const host = 'localhost'
const port = 3320
const baseUrl = `http://${host}:${port}`
const { get, get$ } = require('expect-request-helpers')({baseUrl})

test('expect-server-render-react', t => {
  t.test('res.renderReact', t => {
    const start = ({ route, middlewareOpts = {} }) => new Promise((resolve, reject) => {
      const app = express()
      app.use(serverRenderReact(middlewareOpts))
      if (route) app.get.apply(app, route)
      const server = app.listen(port)
      resolve({server, get$, get})
    })

    const innerHTML = 'test'
    const elementType = 'h1'
    const component = React.createElement(elementType, {}, innerHTML)

    t.test('should render component with correct elementType and innerHTML', t => {
      const route = g('/', (req, res) => res.renderReact(component))

      start({ route }).then(({server, get$}) => get$('/')
        .then($ => t.equal($(elementType).text(), innerHTML, 'should have equal component'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render with correct defaultTitle', t => {
      const route = g('/', (req, res) => res.renderReact(component))
      const middlewareOpts = { defaultTitle: 'test-title' }

      start({ route, middlewareOpts }).then(({server, get$}) => get$('/')
        .then($ => t.equal($('title').text(), middlewareOpts.defaultTitle, 'should have equal title'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render with correct defaultTitle and defaultFormatTitle', t => {
      const title = 'sub-title'

      const route = g('/', (req, res) => res.renderReact(component, { title }))
      const middlewareOpts = { defaultTitle: 'test-title' }

      start({ route, middlewareOpts }).then(({server, get$}) => get$('/')
        .then($ => t.equal($('title').text(), `${middlewareOpts.defaultTitle} - ${title}`, 'should have properly formatted title and sub-title'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render with correct jsSrc and cssHref', t => {
      const jsSrc = '/test-build.js'
      const cssHref = '/test-build.css'

      const route = g('/', (req, res) => res.renderReact(component))
      const middlewareOpts = { jsSrc, cssHref }

      start({ route, middlewareOpts }).then(({server, get$}) => get$('/')
        .then($ => {
          t.equal($('link').attr('href'), cssHref, 'should have equal cssHref')
          t.equal($('script#browser-bundle').attr('src'), jsSrc, 'should have equal jsSrc')
        })
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render component with correct template', t => {
      const rootDOMId = 'test-root'
      const HTML = `<${elementType}>${innerHTML}</${elementType}>`
      const template = '<div id="<%- rootDOMId %>"><%- HTML %></div>'
      const RootComponent = React.createClass({propTypes: { content: React.PropTypes.element }, render: function () { return this.props.content }})

      const route = g('/', (req, res) => res.renderReact(component))
      const middlewareOpts = { template, rootDOMId, RootComponent }

      start({ route, middlewareOpts }).then(({server, get}) => get('/')
        .then(body => t.equal(body, ejs.render(template, { HTML, rootDOMId }), 'should have correct template'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render beautified HTML with shouldbeautifyHTML', t => {
      const route = g('/', (req, res) => res.renderReact(component))
      const middlewareOpts = { shouldbeautifyHTML: true, beautifyHTMLOptions: { indent_with_tabs: true } }

      start({ route, middlewareOpts }).then(({server, get}) => get('/')
        .then(body => t.equal(body, '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width">\n  <title></title>\n  <link href="/build.css" rel="stylesheet" type="text/css">\n  <script id=\'window-environment\' type="text/javascript">\n    window.environment = {"defaultTitle":""}\n  </script>\n</head>\n<body>\n  <div id="root"><div class="app-container">\n\t<h1>test</h1>\n</div></div>\n  <script src=\'/build.js\' id=\'browser-bundle\' type=\'text/javascript\' charset=\'utf-8\'></script>\n</body>\n</html>', 'should have beautified HTML'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render res.environment as window.environment', t => {
      const environmentVariableName = 'test'
      const environmentVariableValue = 123

      const route = g('/', (req, res) => {
        res.environment[environmentVariableName] = environmentVariableValue
        res.renderReact(component)
      })

      start({ route }).then(({server, get$}) => get$('/')
        .then($ => t.equal(JSON.parse($('script#window-environment').text().match(/window.environment = (.*)/)[1])[environmentVariableName], environmentVariableValue, 'should have res.environment data'))
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render TestComponentBasic with correct className and divContents', t => {
      const TestComponentBasic = ({ className, divContents }) => React.createElement(React.createClass({
        render: function () {
          return React.createElement('div', { className }, divContents)
        }
      }))

      const divContents = 'test-test'
      const className = 'test-class'

      const route = g('/', (req, res) => res.renderReact(TestComponentBasic({ className, divContents })))

      start({ route }).then(({server, get$}) => get$('/')
        .then($ => {
          t.equal($('#root').children().length, 1, 'should have equal root component')
          t.equal($('.' + className).text(), divContents, 'should have equal child component')
        })
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render TestComponentForm', t => {
      const TestComponentForm = ({ className, action, method, encType, defaultValue }) => React.createElement(React.createClass({
        render: function () {
          const Input = React.createElement('input', {key: 1, defaultValue})
          const Form = React.createElement(this.props.Form, { className, action, method, encType }, [Input])
          return React.createElement('div', {}, Form)
        }
      }))

      const className = 'test-class'
      const action = '/test'
      const method = 'post'
      const defaultValue = 'test-value'
      const encType = 'multipart/form-data'

      const route = g('/', (req, res) => res.renderReact(TestComponentForm({ className, action, method, defaultValue, encType })))

      start({ route }).then(({server, get$}) => get$('/')
        .then($ => {
          t.equal($('form').attr('class'), className, 'should have equal class')
          t.equal($('form').attr('action'), action, 'should have equal action')
          t.equal($('form').attr('method'), method, 'should have equal method')
          t.equal($('form').attr('enctype'), encType, 'should have equal encType')
          t.equal($('form input').val(), defaultValue, 'should have equal input component defaultValue')
        })
        .then(() => server.close())
        .then(() => t.end()))
    })

    t.test('should render res.Form', t => {
      const className = 'test-class'

      const route = g('/', (req, res) => res.renderReact(React.createElement(res.Form, { className })))

      start({ route }).then(({server, get$}) => get$('/')
        .then($ => t.equal($('form').attr('class'), className, 'should have equal class'))
        .then(() => server.close())
        .then(() => t.end()))
    })
  })

  // FIXME: get$('/') is not returning from a redirect
  //
  // t.test('res.navigate', t => {
  //   const query = { tester: '1' }
  //   const path = '/test'

  //   let app = express()
  //   app.use(serverRenderReact({}))

  //   app.get('/', (req, res) => res.navigate(path, query))
  //   app.get(path, (req, res) => {
  //     t.deepEqual(req.query, query, 'should have equal query')
  //     t.end()
  //   })

  //   const start = new Promise((resolve, reject) => {
  //     let server = app.listen(port)
  //     resolve({server, get$})
  //   })

  //   start.then(({server, get$}) => get$('/')
  //     .then(() => {
  //       server.close()
  //     }))
  // })

  t.test('serverRenderReact.use', t => {
    t.plan(4)

    const serverRenderReact = require('../src')

    const className = 'test-class'

    const path = '/test123'

    const propertyName = 'test-prop'
    const propertyValue = 'test-value'

    serverRenderReact.use((req, res, contentProps, rootProps, next) => {
      contentProps[propertyName] = propertyValue
      contentProps.path = req.path
      rootProps[propertyName] = propertyValue
      next()
    })

    const RootComponent = React.createClass({propTypes: { content: React.PropTypes.element },
      render: function () {
        t.equal(this.props[propertyName], propertyValue, 'should have Root component props[propertyName] equal propertyValue')
        return React.createElement('div', {className: 'app-container'}, this.props.content)
      }})

    const start = ({ route, middlewareOpts = {} }) => new Promise((resolve, reject) => {
      const app = express()
      app.use(serverRenderReact(middlewareOpts))
      if (route) app.get.apply(app, route)
      const server = app.listen(port)
      resolve({server, get$})
    })

    const TestComponentBasic = ({ className }) => React.createElement(React.createClass({
      render: function () {
        t.equal(this.props[propertyName], propertyValue, 'should have child component props[propertyName] equal propertyValue')
        t.equal(this.props.path, path, 'has path from request')
        return React.createElement('div', { className }, path)
      }
    }))

    const route = g(path, (req, res) => res.renderReact(TestComponentBasic({ className })))

    start({ route, middlewareOpts: {RootComponent} }).then(({server, get$}) => get$(path)
      .then($ => {
        t.equal($('.' + className).text(), path, 'should have equal req.path in child component')
      })
      .then(() => server.close()))
  })
})
