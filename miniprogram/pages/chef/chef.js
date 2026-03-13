// pages/chef/chef.js

Page({
    data: {
        pendingOrders: [],
        completedOrders: [],
        loading: true
    },

    onShow: function () {
        this.loadOrders()
    },

    onPullDownRefresh: function () {
        this.loadOrders(() => {
            wx.stopPullDownRefresh()
        })
    },

    loadOrders: function (callback) {
        const db = wx.cloud.database()
        const _ = db.command

        // 加载未完成的点单
        db.collection('orders')
            .where({
                status: _.in(['submitted', 'preparing', 'done'])
            })
            .orderBy('createTime', 'desc')
            .limit(20)
            .get({
                success: (res) => {
                    const pendingOrders = res.data.map(order => ({
                        _id: order._id,
                        items: order.items,
                        note: order.note,
                        mood: order.mood,
                        status: order.status,
                        statusEmoji: this.getStatusEmoji(order.status),
                        statusText: this.getStatusText(order.status),
                        statusClass: 'status-' + order.status,
                        expectTime: order.expectTime || '尽快',
                        timeText: this.formatTime(order.createTime)
                    }))
                    this.setData({ pendingOrders, loading: false })
                    callback && callback()
                }
            })

        // 加载已完成的点单
        db.collection('orders')
            .where({
                status: 'served'
            })
            .orderBy('createTime', 'desc')
            .limit(10)
            .get({
                success: (res) => {
                    const completedOrders = res.data.map(order => ({
                        _id: order._id,
                        itemsText: order.items.map(i => i.name).join('、'),
                        timeText: this.formatTime(order.createTime),
                        photo: order.photo || null
                    }))
                    this.setData({ completedOrders })
                }
            })
    },

    // 更新点单状态
    updateStatus: function (e) {
        const { id, status, text } = e.currentTarget.dataset
        const db = wx.cloud.database()

        const statusMessages = {
            'preparing': '收到！正在准备中~',
            'done': '做好啦！快来吃~',
            'served': '开饭！🎉'
        }

        db.collection('orders').doc(id).update({
            data: {
                status: status,
                statusText: text,
                updateTime: db.serverDate()
            },
            success: () => {
                // 添加状态消息
                db.collection('messages').add({
                    data: {
                        orderId: id,
                        type: 'status_update',
                        content: statusMessages[status] || '状态已更新',
                        sender: 'chef',
                        createTime: db.serverDate()
                    }
                })

                wx.showToast({ title: '已更新！', icon: 'success' })
                wx.vibrateShort({ type: 'light' })
                this.loadOrders()
            },
            fail: () => {
                wx.showToast({ title: '更新失败', icon: 'none' })
            }
        })
    },

    // 拍照打卡并上桌
    serveWithPhoto: function (e) {
        const id = e.currentTarget.dataset.id
        const db = wx.cloud.database()

        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['camera', 'album'],
            sizeType: ['compressed'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath
                // 弹窗提示上传中
                wx.showLoading({ title: '正在上传菜品...', mask: true })

                // 拼接云存储路径
                const suffix = tempFilePath.match(/\.[^.]+?$/)[0]
                const cloudPath = `orders/${id}_${Date.now()}${suffix}`

                wx.cloud.uploadFile({
                    cloudPath: cloudPath,
                    filePath: tempFilePath,
                    success: uploadRes => {
                        const fileID = uploadRes.fileID

                        // 更新订单状态并保存照片 fileID
                        db.collection('orders').doc(id).update({
                            data: {
                                status: 'served',
                                statusText: '吃好啦',
                                updateTime: db.serverDate(),
                                photo: fileID
                            },
                            success: () => {
                                // 1. 先发送一条带图片的回复消息
                                db.collection('messages').add({
                                    data: {
                                        orderId: id,
                                        type: 'image',
                                        content: fileID,
                                        sender: 'chef',
                                        createTime: db.serverDate()
                                    },
                                    success: () => {
                                        // 2. 稍微延迟一点点，再发送"开饭"状态消息，保证顺序
                                        setTimeout(() => {
                                            db.collection('messages').add({
                                                data: {
                                                    orderId: id,
                                                    type: 'status_update',
                                                    content: '开饭！🎉',
                                                    sender: 'chef',
                                                    createTime: db.serverDate()
                                                }
                                            })
                                        }, 500)
                                    }
                                })

                                wx.hideLoading()
                                wx.showToast({ title: '打卡成功！', icon: 'success' })
                                wx.vibrateShort({ type: 'light' })
                                this.loadOrders()
                            },
                            fail: () => {
                                wx.hideLoading()
                                wx.showToast({ title: '更新失败', icon: 'none' })
                            }
                        })
                    },
                    fail: err => {
                        wx.hideLoading()
                        wx.showToast({ title: '上传图片失败', icon: 'none' })
                        console.error('上传失败', err)
                    }
                })
            }
        })
    },

    // 回复点单
    replyOrder: function (e) {
        const id = e.currentTarget.dataset.id
        wx.showModal({
            title: '回复',
            editable: true,
            placeholderText: '输入回复内容...',
            confirmColor: '#4A90D2',
            success: (res) => {
                if (res.confirm && res.content) {
                    const db = wx.cloud.database()
                    db.collection('messages').add({
                        data: {
                            orderId: id,
                            type: 'text_reply',
                            content: res.content,
                            sender: 'chef',
                            createTime: db.serverDate()
                        },
                        success: () => {
                            wx.showToast({ title: '已回复', icon: 'success' })
                        }
                    })
                }
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
        if (isToday) return '今天 ' + timeStr
        return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + timeStr
    },

    previewImage: function (e) {
        const url = e.currentTarget.dataset.url
        wx.previewImage({
            urls: [url]
        })
    },

    // 跳转菜单管理
    navToMenuAdmin: function () {
        wx.navigateTo({
            url: '/pages/menuAdmin/menuAdmin'
        })
    },

    // 导入菜单
    importMenu: function () {
        wx.showModal({
            title: '二次确认',
            content: '这个功能仅在你初次建立 menu 空表时使用。如果表里已经有很多菜，重复点击会产生大量重复菜品。确定要导入硬编码数据吗？',
            success: (res) => {
                if (res.confirm) {
                    const app = getApp()
                    if (app && app.importMenuToCloud) {
                        app.importMenuToCloud()
                    }
                }
            }
        })
    }
})
