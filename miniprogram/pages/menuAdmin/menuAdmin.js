// pages/menuAdmin/menuAdmin.js

Page({
    data: {
        categories: [],
        currentCategory: '',
        allMenuItems: [],
        menuItems: [],
        loading: true
    },

    onLoad: function () {
        this.loadMenu()
    },

    loadMenu: async function () {
        wx.showLoading({ title: '加载菜单中...' })
        const db = wx.cloud.database()
        const MAX_LIMIT = 20

        try {
            const countResult = await db.collection('menu').count()
            const total = countResult.total
            const batchTimes = Math.ceil(total / MAX_LIMIT)
            const tasks = []

            for (let i = 0; i < batchTimes; i++) {
                const promise = db.collection('menu').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
                tasks.push(promise)
            }

            const results = await Promise.all(tasks)
            const items = results.reduce((acc, cur) => acc.concat(cur.data), [])

            // 提取全部分类，去重
            const categorySet = new Set()
            items.forEach(item => categorySet.add(item.category))
            const categories = Array.from(categorySet).map(c => ({ category: c }))

            // 按火锅之类的预设顺序排个序，如果没有就算了直接用 Set 的顺序
            const defaultSort = ['火锅', '外卖', '家常小炒', '川菜', '卤味', '烧烤', '主食']
            categories.sort((a, b) => {
                const idxA = defaultSort.indexOf(a.category)
                const idxB = defaultSort.indexOf(b.category)
                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                return 0
            })

            this.setData({
                allMenuItems: items,
                categories: categories,
                currentCategory: categories.length > 0 ? (this.data.currentCategory || categories[0].category) : '',
                loading: false
            })

            this.updateDisplayList()
            wx.hideLoading()
        } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '加载失败', icon: 'none' })
            console.error(err)
        }
    },

    // 切换分类
    switchCategory: function (e) {
        const category = e.currentTarget.dataset.category
        this.setData({ currentCategory: category })
        this.updateDisplayList()
    },

    // 更新当前分类下展示的列表
    updateDisplayList: function () {
        const { allMenuItems, currentCategory } = this.data
        const filtered = allMenuItems.filter(item => item.category === currentCategory)
        this.setData({ menuItems: filtered })
    },

    // 开关上下架
    toggleAvailable: function (e) {
        const id = e.currentTarget.dataset.id
        const val = e.detail.value

        const db = wx.cloud.database()
        db.collection('menu').doc(id).update({
            data: { available: val },
            success: () => {
                wx.showToast({ title: val ? '已上架' : '已下架', icon: 'success' })
                // 同步更新本地状态
                const index = this.data.allMenuItems.findIndex(i => i._id === id)
                if (index > -1) {
                    this.setData({
                        [`allMenuItems[${index}].available`]: val
                    })
                    this.updateDisplayList()
                }
            }
        })
    },

    // 删除菜品
    deleteItem: function (e) {
        const { id, name } = e.currentTarget.dataset
        wx.showModal({
            title: '二次确认',
            content: `确定要删除 ${name} 吗？`,
            confirmColor: '#E91E63',
            success: (res) => {
                if (res.confirm) {
                    const db = wx.cloud.database()
                    db.collection('menu').doc(id).remove({
                        success: () => {
                            wx.showToast({ title: '已删除', icon: 'success' })
                            this.loadMenu() // 重新加载
                        }
                    })
                }
            }
        })
    },

    // 上传菜品图片
    uploadPhoto: function (e) {
        const id = e.currentTarget.dataset.id
        const db = wx.cloud.database()

        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            sizeType: ['compressed'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath
                wx.showLoading({ title: '正在上传图片...', mask: true })

                const suffix = tempFilePath.match(/\.[^.]+?$/)[0]
                const cloudPath = `menu_covers/${id}_${Date.now()}${suffix}`

                wx.cloud.uploadFile({
                    cloudPath: cloudPath,
                    filePath: tempFilePath,
                    success: uploadRes => {
                        const fileID = uploadRes.fileID

                        // 更新数据库图片信息
                        db.collection('menu').doc(id).update({
                            data: {
                                image: fileID,
                                updateTime: db.serverDate()
                            },
                            success: () => {
                                wx.hideLoading()
                                wx.showToast({ title: '上传成功', icon: 'success' })
                                // 更新本地视图
                                const index = this.data.allMenuItems.findIndex(i => i._id === id)
                                if (index > -1) {
                                    this.setData({
                                        [`allMenuItems[${index}].image`]: fileID
                                    })
                                    this.updateDisplayList()
                                }
                            },
                            fail: () => {
                                wx.hideLoading()
                                wx.showToast({ title: '更新配置失败', icon: 'none' })
                            }
                        })
                    },
                    fail: err => {
                        wx.hideLoading()
                        wx.showToast({ title: '上传失败', icon: 'none' })
                        console.error('上传图片至存储失败', err)
                    }
                })
            }
        })
    }
})
