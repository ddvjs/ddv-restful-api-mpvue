// 一定要导出提前
module.exports = request
// 发送请求
function request (url, body, method, headers) {
  method = method || 'GET'
  if (headers) {
    delete headers.host
    delete headers.Host
    delete headers['Content-Length']
    delete headers['content-length']
  }
  var serverRes = {}
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      data: body,
      method: method,
      header: headers,
      success: function (res) {
        console.log('success-res',res)
        serverRes.status = res.status || serverRes.status
        serverRes.body = res.data
        serverRes.statusCode = res.statusCode
        serverRes.statusMessage = res.statusText || res.statusMessage
        serverRes.status = serverRes.statusMessage

        serverRes.statusCode >= 200 && serverRes.statusCode < 300 ? resolve(serverRes) : reject(serverRes)
      },
      fail: function (res) {
        console.log('fail-res',res)
        serverRes.statusCode = 0
        serverRes.statusMessage = res.errMsg
        serverRes.status = 'wx request fail'
        reject(serverRes)
      }
    })
  })
    .catch(function (e) {
      e.uri = url
      e.method = method
      e.headers = headers
      url = body = method = headers = void 0
      return Promise.reject(e)
    })
    .then(function (res) {
      url = body = method = headers = void 0
      return res
    })
}
