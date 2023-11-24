/**
 * Notes: 服务者模块业务
 * Date: 2023-01-15 07:48:00 
 * Ver : CCMiniCloud Framework 2.0.8 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectWorkService = require('./base_project_work_service.js');

const TaskModel = require('../../model/task_model.js');
const util = require('../../../../framework/utils/util.js');
const TaskService = require('../../service/task_service.js'); 

class WorkTaskService extends BaseProjectWorkService {

	async getWorkTaskDetail(memberId, id) {
		let where = {
			_id: id,
			TASK_MEMBER_ID: memberId
		}
		let task = await TaskModel.getOne(where);

		if (!task) return task;

		// 取得处理流程
		let taskService = new TaskService();
		task.taskLogList = taskService.getTaskLogList(task);

		return task;
	}

	/** 取得分页列表 */
	async getWorkTaskList(memberId, {
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
			TASK_MEMBER_ID: memberId,
			_pid: this.getProjectId(), //复杂的查询在此处标注PID  
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ ['TASK_OBJ.title']: ['like', search] },
				{ ['TASK_OBJ.person']: ['like', search] },
				{ ['TASK_OBJ.phone']: ['like', search] },
				{ ['TASK_OBJ.building']: ['like', search] },
			];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'type': {
					where.and['TASK_OBJ.type'] = sortVal;
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


		result.condition = encodeURIComponent(JSON.stringify(where));

		return result;
	}

	async runWorkTask(id, forms) {

		let service = new TaskService();
		await service.editTask({ id, forms }, 'TASK_RUN_FORMS', 'TASK_RUN_OBJ');

		let data = {
			TASK_STATUS: TaskModel.STATUS.RUN,
			TASK_RUN_TIME: this._timestamp
		}
		await TaskModel.edit(id, data);
 
	}

	async overWorkTask(id, forms) {

		let task = await TaskModel.getOne(id);
		if (!task) this.AppError('工单不存在');


		let service = new TaskService();
		await service.editTask({ id, forms }, 'TASK_OVER_FORMS', 'TASK_OVER_OBJ');

		let data = {
			TASK_STATUS: TaskModel.STATUS.OVER,
			TASK_OVER_TIME: this._timestamp
		}

		// 如果没有做开始处理，直接完成，
		if (task.TASK_RUN_TIME === 0) data.TASK_RUN_TIME = this._timestamp;

		await TaskModel.edit(id, data); 
		 
	}

}

module.exports = WorkTaskService;