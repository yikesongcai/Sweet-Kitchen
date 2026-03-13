// pages/submit/submit.js

Page({
    data: {
        selectedItems: [],
        totalCount: 0,
        expectTime: 'asap',
        customTimeText: '',
        customTimeIndex: [0, 0], // 新增：保存选择器的索引 [0, 0] 表示 [今天, 早餐]
        customTimeRange: [['今天', '明天', '后天'], ['早餐', '中餐', '晚餐', '夜宵']], // 新增：选择器的列数据
        note: '',
        mood: '',
        moodList: ['😋', '🥰', '😊', '🤤', '😌', '🥺'],
        submitting: false,
        showSuccess: false
    },

    onLoad: function (options) {
        if (options.items) {
            const selectedItems = JSON.parse(decodeURIComponent(options.items))
            const totalCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
            this.setData({ selectedItems, totalCount })
        }
    },

    // 选择预设时间
    selectTime: function (e) {
        const time = e.currentTarget.dataset.time
        this.setData({
            expectTime: time,
            customTimeText: ''
        })
    },

    // 自定义时间采用 multiSelector 选择器
    onCustomTimeChange: function (e) {
        // e.detail.value 返回的是选中每一列的索引数组，例如 [0, 1]
        const indexArray = e.detail.value
        const day = this.data.customTimeRange[0][indexArray[0]]
        const meal = this.data.customTimeRange[1][indexArray[1]]

        this.setData({
            expectTime: 'custom',
            customTimeIndex: indexArray,
            customTimeText: `${day} ${meal}`
        })
    },

    // 备注输入
    onNoteInput: function (e) {
        this.setData({ note: e.detail.value })
    },

    // 选择心情
    selectMood: function (e) {
        const mood = e.currentTarget.dataset.mood
        this.setData({
            mood: this.data.mood === mood ? '' : mood
        })
    },

    // 获取期望时间文本
    getExpectTimeText: function () {
        const map = {
            'asap': '尽快',
            'noon': '中午 12:00',
            'dinner': '晚餐 18:00',
            'custom': this.data.customTimeText
        }
        return map[this.data.expectTime] || '尽快'
    },

    // 提交点单
    submitOrder: function () {
        const app = getApp()

        if (app.globalData.userRole !== 'sweet' && app.globalData.userRole !== 'chef') {
            wx.showModal({
                title: '专属厨房',
                content: '抱歉，这是专属小厨房，其他人只能看着流口水哦🤤~',
                showCancel: false,
                confirmText: '太酸了'
            })
            return
        }

        if (this.data.submitting) return
        this.setData({ submitting: true })

        const db = wx.cloud.database()
        const orderData = {
            items: this.data.selectedItems,
            note: this.data.note,
            mood: this.data.mood,
            expectTime: this.getExpectTimeText(),
            expectTimeType: this.data.expectTime,
            status: 'submitted', // submitted -> preparing -> done -> served
            statusText: '已提交',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
        }

        db.collection('orders').add({
            data: orderData,
            success: (res) => {
                // 同时添加一条消息
                db.collection('messages').add({
                    data: {
                        orderId: res._id,
                        type: 'status_update',
                        content: '点单已提交！期望时间：' + this.getExpectTimeText(),
                        sender: 'sweet',
                        createTime: db.serverDate()
                    }
                })

                this.setData({
                    submitting: false,
                    showSuccess: true
                })
                wx.vibrateShort({ type: 'heavy' })
            },
            fail: (err) => {
                console.error('提交失败', err)
                this.setData({ submitting: false })
                wx.showToast({ title: '提交失败，请重试', icon: 'none' })
            }
        })
    },

    // 跳转消息页
    goToMessage: function () {
        wx.switchTab({ url: '/pages/message/message' })
    }
})
