// pages/order/order.js
const app = getApp()

Page({
    data: {
        menuData: [],
        currentCategory: 0,
        selectedItems: [], // [{name, category, quantity}]
        totalCount: 0,
        showCartDetail: false,
        showRandom: false,
        randomItems: []
    },

    onLoad: function () {
        this.loadMenuData()
    },

    onShow: function () {
        // 从提交页返回时刷新数据，或者做一些状态恢复
        this.loadMenuData()
    },

    onPullDownRefresh: function () {
        this.loadMenuData(() => {
            wx.stopPullDownRefresh()
        })
    },

    loadMenuData: async function (cb) {
        const db = wx.cloud.database()
        const MAX_LIMIT = 20

        try {
            const countResult = await db.collection('menu').where({ available: true }).count()
            const total = countResult.total
            const batchTimes = Math.ceil(total / MAX_LIMIT)
            const tasks = []

            for (let i = 0; i < batchTimes; i++) {
                const promise = db.collection('menu').where({ available: true }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
                tasks.push(promise)
            }

            const results = await Promise.all(tasks)
            const items = results.reduce((acc, cur) => acc.concat(cur.data), [])

            const categoryMap = {}

            // 将扁平的数据还原为分类数组结构
            items.forEach(item => {
                if (!categoryMap[item.category]) {
                    categoryMap[item.category] = {
                        category: item.category,
                        emoji: item.emoji,
                        items: []
                    }
                }
                categoryMap[item.category].items.push(item)
            })

            // 排序大类
            const defaultSort = ['火锅', '外卖', '家常小炒', '川菜', '卤味', '烧烤', '主食']
            const menuData = Object.values(categoryMap).sort((a, b) => {
                const idxA = defaultSort.indexOf(a.category)
                const idxB = defaultSort.indexOf(b.category)
                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                return 0
            })

            this.setData({ menuData })
            if (cb) cb()
        } catch (err) {
            console.error('加载菜单失败', err)
            if (cb) cb()
        }
    },

    // 切换分类
    switchCategory: function (e) {
        const index = e.currentTarget.dataset.index
        this.setData({ currentCategory: index })
    },

    // 检查菜品是否已选
    isSelected: function (name) {
        return this.data.selectedItems.some(item => item.name === name)
    },

    // 获取菜品数量
    getItemQty: function (name) {
        const item = this.data.selectedItems.find(item => item.name === name)
        return item ? item.quantity : 0
    },

    // 切换选择菜品
    toggleItem: function (e) {
        const name = e.currentTarget.dataset.name
        const category = e.currentTarget.dataset.category
        let selectedItems = [...this.data.selectedItems]

        const existIndex = selectedItems.findIndex(item => item.name === name)
        if (existIndex > -1) {
            selectedItems.splice(existIndex, 1)
        } else {
            selectedItems.push({ name, category, quantity: 1 })
            // 添加时的触感反馈
            wx.vibrateShort({ type: 'light' })
        }

        this.updateSelectedItems(selectedItems)
    },

    // 增加数量
    increaseQty: function (e) {
        const name = e.currentTarget.dataset.name
        let selectedItems = [...this.data.selectedItems]
        const item = selectedItems.find(item => item.name === name)
        if (item) {
            item.quantity++
            this.updateSelectedItems(selectedItems)
        }
    },

    // 减少数量
    decreaseQty: function (e) {
        const name = e.currentTarget.dataset.name
        let selectedItems = [...this.data.selectedItems]
        const index = selectedItems.findIndex(item => item.name === name)
        if (index > -1) {
            if (selectedItems[index].quantity <= 1) {
                selectedItems.splice(index, 1)
            } else {
                selectedItems[index].quantity--
            }
            this.updateSelectedItems(selectedItems)
        }
    },

    // 更新已选列表
    updateSelectedItems: function (selectedItems) {
        const totalCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
        let updates = { selectedItems, totalCount }

        // 如果减到0了，自动收起详情弹窗
        if (totalCount === 0) {
            updates.showCartDetail = false
        }

        this.setData(updates)
    },

    // 切换购物车详情
    toggleCartDetail: function () {
        this.setData({ showCartDetail: !this.data.showCartDetail })
    },

    // 清空已选
    clearAll: function () {
        wx.showModal({
            title: '提示',
            content: '确定要清空已选菜品吗？',
            confirmColor: '#FF6B81',
            success: (res) => {
                if (res.confirm) {
                    this.setData({
                        selectedItems: [],
                        totalCount: 0,
                        showCartDetail: false
                    })
                }
            }
        })
    },

    // 随机推荐
    randomPick: function () {
        const allItems = []
        this.data.menuData.forEach(cat => {
            cat.items.forEach(item => {
                allItems.push(item)
            })
        })

        // 随机选 3 道
        const shuffled = allItems.sort(() => 0.5 - Math.random())
        const randomItems = shuffled.slice(0, 3)

        this.setData({
            showRandom: true,
            randomItems
        })
    },

    // 关闭随机弹窗
    closeRandom: function () {
        this.setData({ showRandom: false })
    },

    // 添加随机推荐的菜品
    addRandomItems: function () {
        let selectedItems = [...this.data.selectedItems]
        this.data.randomItems.forEach(item => {
            if (!selectedItems.some(s => s.name === item.name)) {
                selectedItems.push({ name: item.name, category: item.category, quantity: 1 })
            }
        })
        this.updateSelectedItems(selectedItems)
        this.setData({ showRandom: false })
        wx.vibrateShort({ type: 'medium' })
        wx.showToast({ title: '已添加！', icon: 'success' })
    },

    // 跳转提交页
    goSubmit: function () {
        // 将已选数据传到提交页
        const selectedData = JSON.stringify(this.data.selectedItems)
        wx.navigateTo({
            url: `/pages/submit/submit?items=${encodeURIComponent(selectedData)}`
        })
    },

    // 长按进入厨师端（隐藏入口）
    goChef: function () {
        wx.vibrateShort({ type: 'medium' })
        wx.navigateTo({
            url: '/pages/chef/chef'
        })
    }
})
