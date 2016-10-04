const async = require('async')
const queryString = require('query-string')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const createForm = require('expect-react-form')
const beautifyHTML = require('js-beautify').html
const ejs = require('ejs')

const defaultTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title><%- title %></title>
  <link href="<%- cssHref %>" rel="stylesheet" type="text/css">
  <script id='window-environment' type="text/javascript">
    window.environment = <%- JSON.stringify(environment) %>
  </script>
</head>
<body>
  <div id="<%- rootDOMId %>"><%- HTML %></div>
  <% if (typeof(dontLoadJS) === 'boolean' && !dontLoadJS) { %><script src='<%- jsSrc %>' id='browser-bundle' type='text/javascript' charset='utf-8'></script><% } %>
</body>
</html>`

let middlewareStack = []

const defaultFormatTitle = function (defaultTitle, title) { return defaultTitle + (title ? ' - ' + title : '') }

let serverRenderReact = ({ RootComponent, template = defaultTemplate, formatTitle = defaultFormatTitle, defaultTitle = '', rootDOMId = 'root', dontLoadJS = false, cssHref = '/build.css', jsSrc = '/build.js', shouldbeautifyHTML = false, beautifyHTMLOptions = {} }) => {
  RootComponent = RootComponent
    ? React.createFactory(RootComponent)
    : React.createClass({propTypes: { content: React.PropTypes.element }, render: function () { return React.createElement('div', {className: 'app-container'}, this.props.content) }})

  return (req, res, next) => {
    const Form = createForm(req, res)
    res.Form = Form

    res.environment = res.environment ? res.environment : {}
    res.environment.defaultTitle = defaultTitle

    res.navigate = (path, query) => {
      const pathname = path + '?' + queryString.stringify(query)
      res.redirect(pathname)
    }

    res.renderReact = (content, opts) => {
      const rootProps = {}
      const contentProps = {}
      const title = formatTitle(defaultTitle, opts ? opts.title : false)
      rootProps.navigate = res.navigate
      contentProps.navigate = res.navigate
      async.each(middlewareStack, (middlewareFunction, callback) => {
        middlewareFunction(req, res, contentProps, rootProps, callback)
      }, () => {
        contentProps.Form = Form
        const contentWithProps = typeof content.type === 'string'
          ? content
          : React.cloneElement(content, contentProps)
        rootProps.content = contentWithProps
        rootProps.opts = opts
        const rawHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(RootComponent, rootProps))
        const HTML = shouldbeautifyHTML ? beautifyHTML(rawHTML, beautifyHTMLOptions) : rawHTML
        const renderedTemplate = ejs.render(template, { HTML, title, rootDOMId, environment: res.environment, dontLoadJS, cssHref, jsSrc })
        res.send(renderedTemplate)
      })
    }

    next()
  }
}

serverRenderReact.use = (middlewareFunction) => {
  middlewareStack.push(middlewareFunction)
}

module.exports = serverRenderReact
