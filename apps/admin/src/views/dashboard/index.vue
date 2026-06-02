<template>
  <el-card shadow="never">
    <template #header>
      <span>欢迎使用大洋云洁管理后台</span>
    </template>
    <p>当前为 P1.5 脚手架阶段，侧栏布局与路由已就绪。</p>
    <p>
      共享包验收：
      <el-tag type="info">投诉待处理 = {{ pendingLabel }}</el-tag>
    </p>
    <el-alert
      title="下一步：P2.1 对接 NestJS Auth；P5 实现业务页面与数据看板"
      type="success"
      :closable="false"
      show-icon
    />
  </el-card>
</template>

<script setup lang="ts">
import { pendingLabel } from '@/shared-smoke';

console.info('[admin] dashboard mounted', { pendingLabel });
</script>
