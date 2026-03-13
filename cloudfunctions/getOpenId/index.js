// 云函数入口文件 - getOpenId
const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取用户 openid
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    return {
        event,
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID,
    }
}
