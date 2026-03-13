// pages/history/history.js

Page({
    data: {
        orders: [],
        stats: {
            totalOrders: 0,
            favoriteFood: '',
            thisMonth: 0
        },
        loading: true,
        hasMore: false,
        page: 0,
        pageSize: 10
    },

    onShow: function () {
        this.setData({ page: 0, orders: [] })
        this.loadOrders()
        this.loadStats()
    },

    loadOrders: function () {
        const db = wx.cloud.database()
        const skip = this.data.page * this.data.pageSize

        db.collection('orders')
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(this.data.pageSize)
            .get({
                success: (res) => {
                    const newOrders = res.data.map(order => ({
                        _id: order._id,
                        dateText: this.formatDate(order.createTime),
                        mood: order.mood || '',
                        statusEmoji: this.getStatusEmoji(order.status),
                        statusText: order.statusText || this.getStatusText(order.status),
                        statusClass: 'status-' + order.status,
                        itemsText: order.items.map(i => i.name + (i.quantity > 1 ? ' ×' + i.quantity : '')).join('、'),
                        expectTime: order.expectTime || '尽快',
                        rawItems: JSON.stringify(order.items),
                        photo: order.photo || null
                    }))

                    this.setData({
                        orders: [...this.data.orders, ...newOrders],
                        loading: false,
                        hasMore: res.data.length >= this.data.pageSize
                    })
                },
                fail: () => {
                    this.setData({ loading: false })
                }
            })
    },

    loadStats: function () {
        const db = wx.cloud.database()

        // 获取总点单数
        db.collection('orders').count({
            success: (res) => {
                this.setData({ 'stats.totalOrders': res.total })
            }
        })

        // 获取本月点单数
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        db.collection('orders')
            .where({
                createTime: db.command.gte(monthStart)
            })
            .count({
                success: (res) => {
                    this.setData({ 'stats.thisMonth': res.total })
                }
            })

        // 统计最爱菜品
        db.collection('orders')
            .orderBy('createTime', 'desc')
            .limit(50)
            .get({
                success: (res) => {
                    const foodCount = {}
                    res.data.forEach(order => {
                        order.items.forEach(item => {
                            foodCount[item.name] = (foodCount[item.name] || 0) + item.quantity
                        })
                    })

                    let maxFood = ''
                    let maxCount = 0
                    Object.keys(foodCount).forEach(name => {
                        if (foodCount[name] > maxCount) {
                            maxCount = foodCount[name]
                            maxFood = name
                        }
                    })

                    if (maxFood) {
                        this.setData({ 'stats.favoriteFood': maxFood })
                    }
                }
            })
    },

    loadMore: function () {
        this.setData({ page: this.data.page + 1 })
        this.loadOrders()
    },

    // 再来一单
    reorder: function (e) {
        const items = e.currentTarget.dataset.items
        wx.navigateTo({
            url: `/pages/submit/submit?items=${encodeURIComponent(items)}`
        })
    },

    getStatusEmoji: function (status) {
        const map = {
            'submitted': '⏳',
            'preparing': '👨‍🍳',
            'done': '✅',
            'served': '🎉'
        }
        return map[status] || '⏳'
    },

    getStatusText: function (status) {
        const map = {
            'submitted': '已提交',
            'preparing': '准备中',
            'done': '已完成',
            'served': '吃好啦'
        }
        return map[status] || '已提交'
    },

    formatDate: function (date) {
        if (!date) return ''
        const d = new Date(date)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()

        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        const timeStr = hours + ':' + minutes

        if (isToday) return '今天 ' + timeStr

        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + timeStr

        const month = d.getMonth() + 1
        const day = d.getDate()
        return month + '月' + day + '日 ' + timeStr
    },

    previewImage: function (e) {
        const url = e.currentTarget.dataset.url
        wx.previewImage({
            urls: [url]
        })
    }
})
