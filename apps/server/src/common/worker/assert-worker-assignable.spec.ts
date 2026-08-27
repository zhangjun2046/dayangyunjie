import { BadRequestException, NotFoundException } from '@nestjs/common';
import { assertWorkerAssignable } from './assert-worker-assignable';

describe('assertWorkerAssignable', () => {
  it('在职员工通过校验', () => {
    expect(() =>
      assertWorkerAssignable({ id: 1, employmentStatus: 'ACTIVE' }, 1),
    ).not.toThrow();
  });

  it('员工不存在时抛出 404', () => {
    expect(() => assertWorkerAssignable(null, 99)).toThrow(NotFoundException);
  });

  it('离职员工抛出 400', () => {
    expect(() =>
      assertWorkerAssignable({ id: 2, employmentStatus: 'RESIGNED' }, 2),
    ).toThrow(BadRequestException);
  });
});
