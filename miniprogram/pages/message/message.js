// pages/message/message.js

Page({
    data: {
        orderMessages: [],
        messages: [],
        loading: true,
        refreshing: false,
        scrollToId: ''
    },

    onShow: function () {
        this.loadMessages()
    },

    onRefresh: function () {
        this.setData({ refreshing: true, scrollToId: '' })
        this.loadMessages(() => {
            this.setData({ refreshing: false })
        })
    },

    loadMessages: function (callback) {
        this.setData({ scrollToId: '' })
        const db = wx.cloud.database()
        const _ = db.command

        // 先获取最近的点单
        db.collection('orders')
            .orderBy('createTime', 'asc')
            .limit(20)
            .get({
                success: (orderRes) => {
                    const orders = orderRes.data
                    if (orders.length === 0) {
                        this.setData({ orderMessages: [], loading: false })
                        callback && callback()
                        return
                    }

                    // 获取所有相关消息
                    const orderIds = orders.map(o => o._id)
                    db.collection('messages')
                        .where({ orderId: _.in(orderIds) })
                        .orderBy('createTime', 'asc')
                        .limit(100)
                        .get({
                            success: (msgRes) => {
                                const messages = msgRes.data
                                // 按点单分组
                                const orderMessages = orders.map(order => {
                                    const orderMsgs = messages.filter(m => m.orderId === order._id)
                                    return {
                                        orderId: order._id,
                                        statusEmoji: this.getStatusEmoji(order.status),
                                        statusText: order.statusText || this.getStatusText(order.status),
                                        statusClass: 'status-' + order.status,
                                        timeText: this.formatTime(order.createTime),
                                        expectTime: order.expectTime,
                                        itemsPreview: order.items.map(i => i.name + (i.quantity > 1 ? '×' + i.quantity : '')).join('、'),
                                        messages: orderMsgs.map(m => ({
                                            ...m,
                                            timeText: this.formatTime(m.createTime)
                                        }))
                                    }
                                })

                                this.setData({ orderMessages, loading: false })
                                
                                // 数据渲染完成后滚动到底部
                                setTimeout(() => {
                                    this.setData({ scrollToId: 'scroll-bottom' })
                                }, 100)

                                callback && callback()
                            },
                            fail: () => {
                                this.setData({ loading: false })
                                callback && callback()
                            }
                        })
                },
                fail: () => {
                    this.setData({ loading: false })
                    callback && callback()
                }
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

    formatTime: function (date) {
        if (!date) return ''
        const d = new Date(date)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()

        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        const timeStr = hours + ':' + minutes

        if (isToday) {
            return '今天 ' + timeStr
        }

        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) {
            return '昨天 ' + timeStr
        }

        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return month + '/' + day + ' ' + timeStr
    },

    previewImage: function (e) {
        const url = e.currentTarget.dataset.url
        wx.previewImage({
            urls: [url]
        })
    }
})
