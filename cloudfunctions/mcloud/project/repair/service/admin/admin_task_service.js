/**
 * Notes: 报修管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-08-22  07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');

const util = require('../../../../framework/utils/util.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const TaskModel = require('../../model/task_model.js'); 
const MemberModel = require('../../model/member_model.js');
const TaskService = require('../../service/task_service.js');
const AdminMemberService = require('./admin_member_service.js'); 

// 导出数据KEY
const EXPORT_TASK_DATA_KEY = 'EXPORT_TASK_DATA';

class AdminTaskService extends BaseProjectAdminService {

	// 派工
	async apptTaskMember(admin, taskId, memberId) {
		let member = await MemberModel.getOne(memberId);
		if (!member) this.AppError('该工作人员不存在');

		let cate = member.MEMBER_CATE_NAME;
		let cateId = member.MEMBER_CATE_ID;
		let name = member.MEMBER_TITLE;

		let data = {
			TASK_MEMBER_ID: memberId,
			TASK_STATUS: TaskModel.STATUS.APPT,

			TASK_MEMBER_NAME: name,
			TASK_MEMBER_CATE_NAME: cate,
			TASK_MEMBER_CATE_ID: cateId,
			TASK_MEMBER_TIME: this._timestamp,

			TASK_MEMBER_ADMIN_ID: admin._id,
			TASK_MEMBER_ADMIN_NAME: admin.ADMIN_NAME,

		} 

		if (member.MEMBER_OBJ.phone) {
			data.TASK_MEMBER_PHONE = member.MEMBER_OBJ.phone;
		}
		await TaskModel.edit(taskId, data);


	}

	async getAdminTaskDetail(id) {
		let where = {
			_id: id
		}
		let task = await TaskModel.getOne(where);

		if (!task) return task;

		// 取得可派工人员列表
		let adminMemberService = new AdminMemberService();
		let memberList = await adminMemberService.getApptMember();

		task.memberList = memberList;


		let taskService = new TaskService();
		task.taskLogList = taskService.getTaskLogList(task);

		return task;
	}

	/** 取得分页列表 */
	async getAdminTaskList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件 
		page,
		size,
		oldTotal = 0
	}) {

		orderBy = orderBy || {
			TASK_ADD_TIME: 'desc'
		};
		let fields = 'TASK_TYPE,TASK_MEMBER_NAME,TASK_MEMBER_CATE_NAME,TASK_STATUS,TASK_OBJ,TASK_ADD_TIME';


		let where = {};
		where.and = {
			_pid: this.getProjectId(), //复杂的查询在此处标注PID  
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ ['TASK_MEMBER_NAME']: ['like', search] },
				{ ['TASK_OBJ.title']: ['like', search] },
				{ ['TASK_OBJ.person']: ['like', search] },
				{ ['TASK_OBJ.phone']: ['like', search] },
				{ ['TASK_OBJ.building']: ['like', search] },
			];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'month': {
					if (sortVal == 99) break;
					let start = sortVal;
					let end = timeUtil.getLastOfMonth(start)
					// console.log(start, end);

					start = timeUtil.time2Timestamp(start + '-01');
					end = timeUtil.time2Timestamp(end);
					//console.log(start, end);

					where.and['TASK_ADD_TIME'] = ['between', start, end];
					where.and['TASK_STATUS'] = 9;
					break;
				}
				case 'type': {
					where.and['TASK_OBJ.type'] = sortVal;
					break;
				}
				case 'typex': {
					where.and['TASK_TYPE'] = Number(sortVal);
					break;
				}
				case 'status': {
					sortVal = Number(sortVal);
					if (sortVal == 99) break;
					where.and['TASK_STATUS'] = sortVal;
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'TASK_ADD_TIME');
					break;
				}
			}
		}

		let result = await TaskModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);


		// 为导出增加一个参数condition
		result.condition = encodeURIComponent(JSON.stringify(where));

		return result;
	}

	/**修改状态 */
	async statusAdminTask(id, status) {
		let data = {
			TASK_STATUS: status,
		}

		let task = await TaskModel.getOne(id);
		if (!task) this.AppError('工单不存在');

		if (status == TaskModel.STATUS.WAIT) {
			//待派工
			data.TASK_MEMBER_ID = '';
			data.TASK_MEMBER_NAME = '';
			data.TASK_MEMBER_PHONE = '';
			data.TASK_MEMBER_CATE_NAME = '';
			data.TASK_MEMBER_CATE_ID = '';
			data.TASK_MEMBER_TIME = 0;

			data.TASK_RUN_FORMS = [];
			data.TASK_RUN_OBJ = {};
			data.TASK_RUN_TIME = 0;

			data.TASK_OVER_FORMS = [];
			data.TASK_OVER_OBJ = {};
			data.TASK_OVER_TIME = 0;
		}
		await TaskModel.edit(id, data);

	}

	// #####################导出数据

	/**获取数据 */
	async getTaskDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_TASK_DATA_KEY);
	}

	/**删除数据 */
	async deleteTaskDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_TASK_DATA_KEY);
	}

	/**导出数据 */
	async exportTaskDataExcel(condition, fields) {

		let where = {
			//TASK_STATUS: ['in', '1,8']
		};

		if (condition) {
			where = JSON.parse(decodeURIComponent(condition));
		}

		// 计算总数
		let total = await TaskModel.count(where);
		console.log('[ExportTask] TOTAL=' + total);

		// 定义存储数据 
		let data = [];

		const options = {
			'!cols': [
				{ column: '序号', wch: 10 },
				...dataUtil.getTitleByForm(fields),
				{ column: '填报时间', wch: 30 },
			]
		};

		// 标题栏
		let ROW_TITLE = options['!cols'].map((item) => (item.column));
		data.push(ROW_TITLE);

		// 按每次100条导出数据
		let size = 100;
		let page = Math.ceil(total / size);
		let orderBy = {
			'TASK_ADD_TIME': 'desc'
		}

		let order = 0;
		for (let i = 1; i <= page; i++) {
			let list = await TaskModel.getList(where, 'TASK_STATUS,TASK_FORMS,TASK_ADD_TIME', orderBy, i, size, false);
			console.log('[ExportTask] Now export cnt=' + list.list.length);

			for (let k = 0; k < list.list.length; k++) {
				let node = list.list[k];

				order++;

				// 数据节点
				let arr = [];
				arr.push(order);
				// 表单
				for (let k = 0; k < fields.length; k++) {
					arr.push(dataUtil.getValByForm(node.TASK_FORMS, fields[k].mark, fields[k].title));
				}

				arr.push(timeUtil.timestamp2Time(node.TASK_ADD_TIME, 'Y-M-D h:m:s'));

				data.push(arr)
			}

		}

		return await exportUtil.exportDataExcel(EXPORT_TASK_DATA_KEY, '报修工单数据', total, data, options);

	}
 
}

module.exports = AdminTaskService;