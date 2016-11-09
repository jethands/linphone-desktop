// ===================================================================
// Contains many common helpers.
// ===================================================================

.import 'uri-tools.js' as UriTools

// ===================================================================
// QML helpers.
// ===================================================================

// Load by default a window in the ui/views folder.
// If options.isString is equals to true, a marshalling component can
// be used.
//
// Supported options: isString, exitHandler.
//
// If exitHandler is used, window must implement exitStatus signal.
function openWindow (window, parent, options) {
  var object

  if (options && options.isString) {
    object = Qt.createQmlObject(window, parent)
  } else {
    var component = Qt.createComponent(
      'qrc:/ui/views/App/' + window + '.qml'
    )

    if (component.status !== Component.Ready) {
      console.debug('Window not ready.')
      if (component.status === Component.Error) {
        console.debug('Error:' + component.errorString())
      }
      return // Error.
    }

    object = component.createObject(parent)
  }

  object.closing.connect(object.destroy.bind(object))

  if (options && options.exitHandler) {
    object.exitStatus.connect(
      // Bind to access parent properties.
      options.exitHandler.bind(parent)
    )
  }

  object.show()

  return object
}

// -------------------------------------------------------------------

// Display a simple ConfirmDialog component.
// Wrap the openWindow function.
function openConfirmDialog (parent, options) {
  return openWindow(
    'import QtQuick 2.7;' +
      'import Common 1.0;' +
      'ConfirmDialog {' +
      'descriptionText: \'' + options.descriptionText + '\';' +
      'title: \'' + options.title + '\'' +
      '}',
    parent, {
      isString: true,
      exitHandler: options.exitHandler
    }
  )
}

// -------------------------------------------------------------------

// A copy of `Window.setTimeout` from js.
// delay is in milliseconds.
function setTimeout (parent, delay, cb) {
  var timer = new (function (parent) {
    return Qt.createQmlObject('import QtQuick 2.7; Timer { }', parent)
  })(parent)

  timer.interval = delay
  timer.repeat = false
  timer.triggered.connect(cb)
  timer.start()

  return timer
}

// Destroy timeout.
function clearTimeout (timer) {
  timer.stop() // NECESSARY.
  timer.destroy()
}

// -------------------------------------------------------------------

// Connect a signal to a function only for one call.
function connectOnce (signal, cb) {
  var func = function () {
    signal.disconnect(func)
    cb.apply(this, arguments)
  }

  signal.connect(func)
  return func
}

// -------------------------------------------------------------------

// Returns the top (root) parent of one object.
function getTopParent (object, useFakeParent) {
  function _getTopParent (object, useFakeParent) {
    return (useFakeParent && object.$parent) || object.parent
  }

  var parent = _getTopParent(object, useFakeParent)
  var p

  while ((p = _getTopParent(parent, useFakeParent)) != null) {
    parent = p
  }

  return parent
}

// -------------------------------------------------------------------

// Test the type of a qml object.
// Warning: this function is probably not portable
// on new versions of Qt.
//
// So, if you want to use it on a specific `className`, please to add
// a test in `test_qmlTypeof_data` of `utils.spec.qml`.
function qmlTypeof (object, className) {
  var str = object.toString()

  return (
    str.indexOf(className + '(') == 0 ||
    str.indexOf(className + '_QML') == 0
  )
}

// -------------------------------------------------------------------

function encodeUrisToQmlFormat (text, options) {
  var images = ''

  if (options == null) {
    options = {}
  }

  text = text
    .replace(/</g, '\u2063&lt;')
    .replace(/>/g, '\u2063&gt;')
    .replace(UriTools.URI_REGEX, function (match) {
      // If it's a simple URL, transforms it in URI.
      if (startsWith(match, 'www.')) {
        match = 'http://' + match
      }

      var ext = getExtension(match)
      if (includes([ 'jpg', 'jpeg', 'gif', 'png', 'svg' ], ext)) {
        images += '<a href="' + match + '"><img' + (
          options.imagesWidth != null
            ? ' width="' + options.imagesWidth + '"'
            : ''
        ) + (
          options.imagesHeight != null
            ? ' height="' + options.imagesHeight + '"'
            : ''
        ) + ' src="' + match + '" /></a>'
      }

      return '<a href="' + match + '">' + match + '</a>'
    })

  if (images.length > 0) {
    images = '<div>' + images + '</div>'
  }

  return images.concat('<p>' + text + '</p>')
}

// -------------------------------------------------------------------

// Test if a point is in a item.
//
// `source` is the item that generated the point.
// `target` is the item to test.
// `point` is the point to test.
function pointIsInItem (source, target, point) {
  point = source.mapToItem(target.parent, point.x, point.y)

  return (
    point.x >= target.x &&
    point.y >= target.y &&
    point.x < target.x + target.width &&
    point.y < target.y + target.height
  )
}

// ===================================================================
// GENERIC.
// ===================================================================

function _computeOptimizedCb (func, context) {
  return (context != null)
    ? (function () {
      return func.apply(context, arguments)
    }) : func
}

// -------------------------------------------------------------------

// Convert a snake_case string to a lowerCamelCase string.
function snakeToCamel (s) {
  return s.replace(/(\_\w)/g, function (matches) {
    return matches[1].toUpperCase()
  })
}

// -------------------------------------------------------------------

// Basic assert function.
function assert (condition, message) {
  if (!condition) {
    throw new Error('Assert: ' + message)
  }
}

// -------------------------------------------------------------------

// Returns the extension of a filename.
function getExtension (str) {
  var index = str.lastIndexOf('.')

  if (index === -1) {
    return ''
  }

  return str.slice(index + 1)
}

// -------------------------------------------------------------------

// Test if a string starts by a given string.
function startsWith (str, searchStr) {
  return str.slice(0, searchStr.length) === searchStr
}

// -------------------------------------------------------------------

// Invoke a `cb` function with each value of the interval: `[0, n[`.
// Return a mapped array created with the returned values of `cb`.
function times (n, cb, context) {
  var arr = Array(Math.max(0, n))
  cb = _computeOptimizedCb(cb, context, 1)

  for (var i = 0; i < n; i++) {
    arr[i] = cb(i)
  }

  return arr
}

// -------------------------------------------------------------------

function isArray (array) {
  return (array instanceof Array)
}

// -------------------------------------------------------------------

function isString (string) {
  return typeof string === 'string' || string instanceof String
}

// -------------------------------------------------------------------

// Generate a random number in the [min, max[ interval.
// Uniform distrib.
function genRandomNumber (min, max) {
  return Math.random() * (max - min) + min
}

// -------------------------------------------------------------------

// Generate a random number between a set of intervals.
// The `intervals` param must be orderer like this:
// `[ [ 1, 4 ], [ 8, 16 ], [ 22, 25 ] ]`
function genRandomNumberBetweenIntervals (intervals) {
  if (intervals.length === 1) {
    return genRandomNumber(intervals[0][0], intervals[0][1])
  }

  // Compute the intervals size.
  var size = 0
  intervals.forEach(function (interval) {
    size += interval[1] - interval[0]
  })

  // Generate a value in the interval: `[0, size[`
  var n = genRandomNumber(0, size)

  // Map the value in the right interval.
  n += intervals[0][0]
  for (var i = 0; i < intervals.length - 1; i++) {
    if (n < intervals[i][1]) {
      break
    }

    n += intervals[i + 1][0] - intervals[i][1]
  }

  return n
}

// -------------------------------------------------------------------

// Returns an array from a `object` or `array` argument.
function ensureArray (obj) {
  if (isArray(obj)) {
    return obj
  }

  var keys = Object.keys(obj)
  var length = keys.length
  var values = Array(length)

  for (var i = 0; i < length; i++) {
    values[i] = obj[keys[i]]
  }

  return values
}

// -------------------------------------------------------------------

// Test if a value is included in an array or object.
function includes (obj, value, startIndex) {
  obj = ensureArray(obj)

  if (startIndex == null) {
    startIndex = 0
  }

  var length = obj.length

  for (var i = startIndex; i < length; i++) {
    if (value === obj[i]) {
      return true
    }
  }

  return false
}