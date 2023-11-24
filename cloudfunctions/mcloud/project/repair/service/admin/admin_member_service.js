/**
 * Notes: 资讯后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2021-07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const util = require('../../../../framework/utils/util.js');
const md5Lib = require('../../../../framework/lib/md5_lib.js');

const MemberModel = require('../../model/member_model.js');

class AdminMemberService extends BaseProjectAdminService {

	// 取得可派工人员列表
	async getApptMember(cateId = null) {

		let memberWhere = {
			MEMBER_STATUS: MemberModel.STATUS.COMM
		}
		if (cateId) memberWhere.MEMBER_CATE_ID = cateId;

		let memberFields = 'MEMBER_CATE_ID,MEMBER_CATE_NAME,MEMBER_TITLE';
		let memberOrderBy = {
			'MEMBER_ADD_TIME': 'desc'
		}
		return await MemberModel.getAll(memberWhere, memberFields, memberOrderBy, 200);
	}


	async getMemberList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'MEMBER_ADD_TIME': 'desc'
		};
		let fields = '*';

		let where = {};
		if (util.isDefined(search) && search) {
			where.MEMBER_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status': {
					// 按类型
					where.MEMBER_STATUS = Number(sortVal);
					break;
				}
				case 'cateId': {
					// 按类型
					where.MEMBER_CATE_ID = sortVal;
					break;
				}
			}
		}

		return await MemberModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}


	async statusMember(id, status) {
		let data = {
			MEMBER_STATUS: status
		}
		let where = {
			_id: id,
		}
		return await MemberModel.edit(where, data);
	}

	// 更新forms信息
	async updateMemberForms({
		id,
		hasImageForms
	}) {
		await MemberModel.editForms(id, 'MEMBER_FORMS', 'MEMBER_OBJ', hasImageForms);
	}


	async delMember(id) {
		let where = {
			_id: id
		}

		await MemberModel.del(where);
	}


	async getMemberDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		return await MemberModel.getOne(where, fields);
	}


	async insertMember({
		title,
		cateId,
		cateName,
		phone,
		password,
		forms
	}) {

		let where = {
			MEMBER_PHONE: phone,
		}
		if (await MemberModel.count(where))
			this.AppError('该登陆手机已经存在');


		// 赋值 
		let data = {};
		data.MEMBER_TITLE = title;
		data.MEMBER_CATE_ID = cateId;
		data.MEMBER_CATE_NAME = cateName;

		data.MEMBER_PHONE = phone;
		if (password)
			data.MEMBER_PASSWORD = md5Lib.md5(password);
		if (!phone) data.MEMBER_PASSWORD = '';

		data.MEMBER_OBJ = dataUtil.dbForms2Obj(forms);
		data.MEMBER_FORMS = forms;

		let id = await MemberModel.insert(data);


		return {
			id
		};
	}


	async editMember({
		id,
		title,
		cateId,
		cateName,
		phone,
		password,
		forms
	}) {

		let where = {
			MEMBER_PHONE: phone,
			_id: ['<>', id]
		}
		if (await MemberModel.count(where))
			this.AppError('该登陆手机已经存在');



		// 赋值 
		let data = {};
		data.MEMBER_TITLE = title;
		data.MEMBER_CATE_ID = cateId;
		data.MEMBER_CATE_NAME = cateName;


		data.MEMBER_PHONE = phone;
		if (password)
			data.MEMBER_PASSWORD = md5Lib.md5(password);
		if (!phone) data.MEMBER_PASSWORD = '';

		data.MEMBER_OBJ = dataUtil.dbForms2Obj(forms);
		data.MEMBER_FORMS = forms;

		await MemberModel.edit(id, data);


	}
}

module.exports = AdminMemberService;