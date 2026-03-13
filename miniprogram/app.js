// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-6gzwh1yn4645d3ef', // 明确指定你的云环境 ID
        traceUser: true,
      })
    }

    // 获取用户 openid
    this.getUserOpenId()
  },

  globalData: {
    openid: '',
    userRole: '', // 'sweet' 或 'chef'
    // 菜单数据
    menuData: [
      {
        category: '火锅',
        emoji: '🍲',
        items: ['海底捞', '巴奴', '虾滑自助', '自助小火锅']
      },
      {
        category: '外卖',
        emoji: '🛵',
        items: ['麦当劳', '肯德基', '塔斯汀', '蛋挞', '七欣天', '麻辣烫', '麻辣拌']
      },
      {
        category: '家常小炒',
        emoji: '🥬',
        items: ['有机花菜', '清炒时蔬', '蒜苔炒肉', '干煸豆角', '小炒黄牛肉', '尖椒肉丝', '青椒炒蛋', '香辣土豆丁']
      },
      {
        category: '川菜',
        emoji: '🌶️',
        items: ['毛血旺', '宫保鸡丁', '水煮肉片', '水煮鱼', '鱼香肉丝', '鱼香茄子']
      },
      {
        category: '卤味',
        emoji: '🍢',
        items: ['鸡爪', '鸡腿', '鸡翅', '鸭脖', '鸭架', '莲藕', '卤豆干', '卤海带']
      },
      {
        category: '烧烤',
        emoji: '🔥',
        items: ['羊肉串', '牛肉串', '骨肉相连', '烤羊排', '烤板筋', '烤土豆片', '烤韭菜', '烤金针菇', '烤玉米']
      },
      {
        category: '主食',
        emoji: '🍜',
        items: ['板面', '烩面', '螺蛳粉', '火鸡面', '大米', '蛋炒饭', '老坛酸菜牛肉面']
      }
    ]
  },

  getUserOpenId: function () {
    const that = this
    wx.cloud.callFunction({
      name: 'getOpenId',
      complete: res => {
        if (res.result) {
          that.globalData.openid = res.result.openid
          // 检查用户角色
          that.checkUserRole(res.result.openid)
        }
      }
    })
  },

  checkUserRole: function (openid) {
    const that = this

    //TODO: 直接在代码层面硬性绑定你们两人的 openid，省去了你去云数据库手动配置的麻烦！
    if (openid === '???') {
      that.globalData.userRole = 'sweet'
    } else if (openid === '???') {
      that.globalData.userRole = 'chef'
    }

    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: openid
    }).get({
      success: res => {
        if (res.data.length > 0) {
          // 如果数据库里有记录，则覆盖
          that.globalData.userRole = res.data[0].role
        }
      }
    })
  },

  // 一键将硬编码的菜单导入云数据库 (用完隐藏)
  importMenuToCloud: function () {
    const db = wx.cloud.database()
    const menuCollection = db.collection('menu')
    let successCount = 0
    let failCount = 0
    let totalItems = 0

    // 计算总数
    this.globalData.menuData.forEach(category => {
      totalItems += category.items.length
    })

    wx.showLoading({ title: '导入中0/' + totalItems, mask: true })

    this.globalData.menuData.forEach(category => {
      category.items.forEach(itemName => {
        menuCollection.add({
          data: {
            category: category.category,
            emoji: category.emoji,
            name: itemName,
            image: '',
            available: true,
            createTime: db.serverDate()
          },
          success: () => {
            successCount++
            wx.showLoading({ title: `导入中${successCount}/${totalItems}` })
            if (successCount + failCount === totalItems) {
              wx.hideLoading()
              wx.showModal({
                title: '导入完成',
                content: `成功: ${successCount}, 失败: ${failCount}`,
                showCancel: false
              })
            }
          },
          fail: err => {
            console.error('导入失败', itemName, err)
            failCount++
            if (successCount + failCount === totalItems) {
              wx.hideLoading()
              wx.showModal({ title: '导入完成', content: `含失败记录`, showCancel: false })
            }
          }
        })
      })
    })
  }
})
