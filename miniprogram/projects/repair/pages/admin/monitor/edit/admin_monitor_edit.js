const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const validate = require('../../../../../../helper/validate.js');
const MonitorBiz = require('../../../../biz/monitor_biz.js');
const AdminMonitorBiz = require('../../../../biz/admin_monitor_biz.js'); 
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.MONITOR_NAME + '-修改',
		});

		this._loadDetail();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () { },

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadDetail();
		this.selectComponent("#cmpt-form").reload();
		wx.stopPullDownRefresh();
	},

	model: function (e) {
		pageHelper.model(this, e);
	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let id = this.data.id;
		if (!id) return;

		if (!this.data.isLoad) this.setData(AdminMonitorBiz.initFormData(id)); // 初始化表单数据

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};
		let monitor = await cloudHelper.callCloudData('admin/monitor_detail', params, opt);
		if (!monitor) {
			this.setData({
				isLoad: null
			})
			return;
		};

		if (!Array.isArray(monitor.MONITOR_JOIN_FORMS) || monitor.MONITOR_JOIN_FORMS.length == 0)
		monitor.MONITOR_JOIN_FORMS = projectSetting.MONITOR_JOIN_FIELDS;


		this.setData({
			isLoad: true,

			formTitle: monitor.MONITOR_TITLE,
			formCateId: monitor.MONITOR_CATE_ID,
			formOrder: monitor.MONITOR_ORDER,  

			formForms: monitor.MONITOR_FORMS, 

		});

	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		// 数据校验
		let data = this.data;
		data = validate.check(data, AdminMonitorBiz.CHECK_FORM, this);
		if (!data) return; 
	 
		let forms = this.selectComponent("#cmpt-form").getForms(true);
		if (!forms) return;
		data.forms = forms;

		data.cateName = MonitorBiz.getCateName(data.cateId);

		try {
			let monitorId = this.data.id;
			data.id = monitorId;

			// 先修改，再上传 
			await cloudHelper.callCloudSumbit('admin/monitor_edit', data).then(res => {
				// 更新列表页面数据
				let node = {
					'MONITOR_TITLE': data.title,
					'MONITOR_CATE_NAME': data.cateName,
					'MONITOR_ORDER': data.order,  
				}
				pageHelper.modifyPrevPageListNodeObject(monitorId, node);
			});

			await cloudHelper.transFormsTempPics(forms, 'monitor/', monitorId, 'admin/monitor_update_forms');

			let callback = () => {
				wx.navigateBack();
			}
			pageHelper.showSuccToast('修改成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}

	},
 
	url: function (e) {
		pageHelper.url(e, this);
	},

	switchModel: function (e) {
		pageHelper.switchModel(this, e);
	}, 

})