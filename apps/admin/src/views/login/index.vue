<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-logo">
          <span class="login-logo-icon">🏠</span>
        </div>
        <div class="login-title">大洋云洁 · 管理后台</div>
        <div class="login-subtitle">智享社区综合服务平台</div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="账号" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入管理员邮箱"
            clearable
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Lock, User } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/store';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  email: 'admin@dayunyunjie.com',
  password: 'admin123',
});

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.login(form.email, form.password);
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.push(redirect);
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      '邮箱或密码错误';
    ElMessage.error(msg);
    console.info('[admin] login failed', err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d3557 0%, #457b9d 50%, #a8dadc 100%);
}

.login-card {
  width: 420px;

  .login-logo {
    text-align: center;
    margin-bottom: 8px;
    font-size: 36px;
  }

  .login-title {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .login-subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: #909399;
    text-align: center;
  }

  .login-btn {
    width: 100%;
    height: 42px;
    font-size: 16px;
  }
}
</style>
