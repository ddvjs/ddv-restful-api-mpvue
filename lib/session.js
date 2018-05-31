// 导出 session 模块
module.exports = session
var util = require('../util')
var url = require('ddv-auth/util/url')
var sign = require('ddv-auth/util/sign')
var parseDataByBody = require('./parseDataByBody.js')
// 请求模块
var request = require('./request.js')

// 对外 cookie 编码 接口模块
Object.assign(session, {
  // 解码
  unescape: function (str) {
    return unescape(str || '')
  },
  // 编码
  escape: function (str) {
    return escape(str || '')
  }
})
// 对外api接口模块
Object.assign(session, {
  // 设置是否使用长存储
  setLongStorage: function setLongStorage (isUseLong) {
    session.isLongStorage = Boolean(isUseLong)
  },
  // 设置是否使用长存储
  setSessionInitTrySum: function setSessionInitTrySum (sum) {
    session.initTrySum = sum || session.initTrySum
  },
  // 设置初始化session的path
  setSessionInitPath: function setSessionInitPath (path) {
    session.sessionInitPath = path || session.sessionInitPath
  }
})

session.isLongStorage = false
session.sessionInitPath = '/session/init'

Object.assign(session, {
  getTrueData: function getTrueData (sessionInitUrl, tryNum) {
    var sid = getSidByUrl(sessionInitUrl)
    var queue = getQueue(sid)
    var promise = new Promise(function (resolve, reject) {
      var isRunIng = (queue && queue.length > 0) || false
      queue.push([resolve, reject, this])
      isRunIng || getTrueDataRun(sid, sessionInitUrl, queue, tryNum)
      sid = tryNum = queue = resolve = reject = void 0
    }.bind(this))
    return promise
  }
})

function sessionInit (sessionInitUrl, data) {
  var requestId, authorization, signingKey
  requestId = util.createRequestId()
  // 授权字符串
  authorization = 'session-init-v1'
  authorization += '/' + requestId
  authorization += '/' + (data.sessionId || '0')
  authorization += '/' + data.sessionCard
  authorization += '/' + session.getUTCServerTime(data.differenceTime || 0) + '/' + '1800'
  signingKey = sign.HmacSHA256(authorization, (data.sessionKey || 'sessionKey'))
  // 生成加密key
  authorization += '/' + util.createGuid()
  authorization += '/' + sign.HmacSHA256(authorization, signingKey)

  // 返回一个请求
  return request(sessionInitUrl, '', 'GET', {
    Authorization: authorization
  })
    .then(function (res) {
      return parseDataByBody(res)
    }, function (e) {
      return parseDataByBody(e, true)
    })
    .then(function (res) {
      var sessionData
      if (res.type !== 'update') {
        // 如果不需要更新就跳过
        return data
      }
      sessionData = res.sessionData
      // 服务器时间
      sessionData.serverTime = sessionData.serverTime || util.time()
      // 本地时间
      sessionData.localTime = util.time()
      // 服务器时间减去本地时间
      sessionData.differenceTime = sessionData.serverTime - sessionData.localTime
      // 到期时间

      if (sessionData.expiresTime !== void 0 && sessionData.expiresTime !== null) {
        sessionData.expiresTime += sessionData.differenceTime
      } else {
        // 过期时间，现在本地时间推后7天到期
        sessionData.expiresTime = util.time() + (60 * 60 * 24 * 7)
      }
      // 获取会话数据
      return sessionData
    })
    .then(function (res) {
      requestId = authorization = signingKey = sessionInitUrl = data = void 0
      return res
    }, function (e) {
      requestId = authorization = signingKey = sessionInitUrl = data = void 0
      return Promise.reject(e)
    })
}

function getTrueDataRun (sid, sessionInitUrl, queue, tryNum) {
  var storage = getStorageObj(sid)
  tryNum = tryNum || 0
  return (
    tryNum !== true &&
      storage.sessionData &&
      parseInt(tryNum) < 1
      ? Promise.resolve(storage.sessionData)
      : session.getData(sid)
  )
    .then(function (data) {
      // 基本需要的数据检测，并且错误少于2
      data = (data && data.sessionId && data.sessionKey && data.sessionCard && tryNum !== true && tryNum < 2) ? data : Object.create(null)

      if (data.sessionCard) {
        return data
      } else {
        var userAgent = ''
        if (typeof window !== 'undefined' && window.navigator) {
          userAgent = userAgent || window.navigator.userAgent || window.navigator.useragent || userAgent
        }
        return session.createCard(userAgent)
          .then(function (sessionCard) {
            var r = data
            data = void 0
            r.sessionCard = sessionCard
            return r
          })
      }
    })
    .then(function (data) {
      if (tryNum !== true && data && data.sessionId && data.sessionKey && data.sessionCard && data.expiresTime && util.time() < (data.expiresTime - 5) && parseInt(tryNum) < 1) {
        return data
      } else {
        return session.init(sessionInitUrl, data)
          .then(function (data) {
            return session.setData(sid, data)
              .then(function () {
                var r = data
                // 因为闭包原因，所以特定来解除引用
                data = void 0
                return r
              }, function (e) {
                // 因为闭包原因，所以特定来解除引用
                data = void 0
                return Promise.reject(e)
              })
          })
      }
    })
    .then(function (data) {
      var cbt
      while ((cbt = queue.shift())) {
        if (cbt && cbt[0] && cbt[2] && util.isFunction(cbt[0])) {
          try {
            cbt[0].call(cbt[2], data)
          } catch (e) {}
        }
        cbt = void 0
      }
      sid = sessionInitUrl = queue = storage = tryNum = data = void 0
    }, function (e) {
      var cbt
      while ((cbt = queue.shift())) {
        if (cbt && cbt[1] && cbt[2] && util.isFunction(cbt[1])) {
          try {
            cbt[1].call(cbt[2], e)
          } catch (e) {}
        }
        cbt = void 0
      }
      sid = sessionInitUrl = queue = storage = tryNum = e = void 0
    })
}

function setData (sid, data) {
  return new Promise(function (resolve, reject) {
    this.wx.setStorage({
      key: sid,
      data: data,
      success: function (res) {
        resolve(res)
      },
      fail: function (e) {
        reject(new Error(e.errMsg || 'unknow error'))
      }
    })
  })
}

function getData (sid) {
  return new Promise(function (resolve, reject) {
    this.wx.getStorage({
      key: sid,
      success: function (res) {
        resolve(res.data)
      },
      fail: function (e) {
        reject(new Error(e.errMsg || 'unknow error'))
      }
    })
  }).then(function (data) {
    return data || Object.create(null)
  }).catch(function (data) {
    return Object.create(null)
  })
}

Object.assign(session, {
  init: sessionInit,
  createCard: createCard,
  getUTCServerTime: getUTCServerTime,
  getData: getData,
  setData: setData
})

var sessionStorageObj = Object.create(null)

function getStorageObj (sid) {
  sessionStorageObj[sid] = sessionStorageObj[sid] || Object.create(null)
  return sessionStorageObj[sid]
}
var sessionGetTrueQueueCb = Object.create(null)
// 获取队列
function getQueue (sid) {
  sessionGetTrueQueueCb[sid] = sessionGetTrueQueueCb[sid] || []
  return sessionGetTrueQueueCb[sid]
}

function getSidByUrl (uri) {
  var obj = url.parse(uri)
  return url.urlEncode((obj.host || '') + (obj.port || ''))
}

function session (sessionInitUrl, tryNum) {
  return session.getTrueData(sessionInitUrl, tryNum)
}

function getUTCServerTime (differenceTime) {
  var d
  d = new Date()
  d = new Date(parseInt(d.getTime() + ((parseInt(differenceTime) || 0) * 1000)) + (60 * d.getTimezoneOffset()))
  return util.gmdate('Y-m-dTH:i:sZ', parseInt(d.getTime() / 1000))
}

function createCard (userAgent) {
  return new Promise(function (resolve, reject) {
    var sessionCard = ''
    var uamd5 = sign.md5Hex(userAgent)
    sessionCard = uamd5.substr(0, 4)
    sessionCard += '-' + sign.md5Hex((new Date().toString()) + userAgent + sessionCard).substr(4, 8)
    sessionCard += '-' + sign.md5Hex(uamd5 + userAgent).substr(4, 4)
    sessionCard += '-' + sign.md5Hex(uamd5 + userAgent + userAgent).substr(5, 4)
    sessionCard += '-' + sign.md5Hex(uamd5 + sessionCard + uamd5).substr(4, 4)
    sessionCard += '-' + sign.md5Hex((new Date().toString()) + sessionCard + userAgent).substr(2, 12)
    sessionCard += '-' + uamd5.substr(0, 8)
    resolve(sessionCard)
  })
}
