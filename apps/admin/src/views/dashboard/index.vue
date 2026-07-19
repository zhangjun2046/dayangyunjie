<template>
  <div class="dashboard-page">
    <!-- 欢迎条 -->
    <el-card shadow="never" class="welcome-card">
      <div class="welcome-content">
        <div class="welcome-text">
          <span class="welcome-greeting">{{ greeting }}，{{ userStore.username || '管理员' }}</span>
          <el-tag :type="userStore.isSuperAdmin ? 'danger' : 'info'" size="small" class="role-tag">
            {{ roleLabel }}
          </el-tag>
        </div>
        <div class="welcome-sub">欢迎回来，以下是需要您处理的待办事项</div>
      </div>
    </el-card>

    <!-- 待办事项卡片组 -->
    <div v-if="visibleCards.length > 0" class="todo-cards">
      <el-card
        v-for="card in visibleCards"
        :key="card.menuKey"
        shadow="hover"
        class="todo-card"
        @click="goToCard(card)"
      >
        <div class="todo-card-icon" :style="{ background: card.color }">
          <el-icon :size="24"><component :is="card.icon" /></el-icon>
        </div>
        <div class="todo-card-body">
          <div class="todo-card-label">{{ card.label }}</div>
          <div class="todo-card-count">
            <span v-if="card.loading" class="count-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
            </span>
            <span v-else>{{ card.count }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else description="暂无可查看的待办事项，请联系超级管理员分配功能授权" />
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Loading, Brush, Delete, Service, Warning } from '@element-plus/icons-vue';

import { useUserStore } from '@/store';
import { fetchCleaningOrders } from '@/api/cleaning';
import { fetchRecyclingOrders } from '@/api/recycling';
import { fetchConsultOrders } from '@/api/consult';
import { fetchComplaints } from '@/api/complaint';

const userStore = useUserStore();
const router = useRouter();

// ─── 欢迎条 ───────────────────────────────────────────────────────────────────

const roleLabel = computed(() => (userStore.isSuperAdmin ? '超级管理员' : '普通管理员'));

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

// ─── 待办事项卡片组 ───────────────────────────────────────────────────────────

interface TodoCard {
  menuKey: string;
  label: string;
  path: string;
  status: string;
  icon: unknown;
  color: string;
  count: number;
  loading: boolean;
  fetcher: () => Promise<number>;
}

const cards = reactive<TodoCard[]>([
  {
    menuKey: 'orders.cleaning',
    label: '待派单保洁订单',
    path: '/orders/cleaning',
    status: 'PENDING_ASSIGN',
    icon: markRaw(Brush),
    color: '#409eff',
    count: 0,
    loading: false,
    fetcher: async () => {
      const res = await fetchCleaningOrders({ status: 'PENDING_ASSIGN', page: 1, pageSize: 1 });
      return res.data.data?.total ?? 0;
    },
  },
  {
    menuKey: 'orders.recycling',
    label: '待派单废品订单',
    path: '/orders/recycling',
    status: 'PENDING_ASSIGN',
    icon: markRaw(Delete),
    color: '#67c23a',
    count: 0,
    loading: false,
    fetcher: async () => {
      const res = await fetchRecyclingOrders({ status: 'PENDING_ASSIGN', page: 1, pageSize: 1 });
      return res.data.data?.total ?? 0;
    },
  },
  {
    menuKey: 'orders.consult',
    label: '待跟进家政咨询单',
    path: '/orders/consult',
    status: 'FOLLOW_UP',
    icon: markRaw(Service),
    color: '#e6a23c',
    count: 0,
    loading: false,
    fetcher: async () => {
      const res = await fetchConsultOrders({ status: 'FOLLOW_UP', page: 1, pageSize: 1 });
      return res.data.data?.total ?? 0;
    },
  },
  {
    menuKey: 'orders.complaint',
    label: '待处理投诉',
    path: '/orders/complaint',
    status: 'PENDING',
    icon: markRaw(Warning),
    color: '#f56c6c',
    count: 0,
    loading: false,
    fetcher: async () => {
      const res = await fetchComplaints({ status: 'PENDING', page: 1, pageSize: 1 });
      return res.data.data?.total ?? 0;
    },
  },
]);

/** 按功能授权过滤：超级管理员始终展示全部四张，普通管理员按 hasMenu 判断 */
const visibleCards = computed(() => cards.filter((c) => userStore.hasMenu(c.menuKey)));

const loadCardCounts = async () => {
  await Promise.all(
    visibleCards.value.map(async (card) => {
      card.loading = true;
      try {
        card.count = await card.fetcher();
      } catch (e) {
        console.error('[Dashboard] load todo card failed', card.menuKey, e);
        card.count = 0;
      } finally {
        card.loading = false;
      }
    }),
  );
  console.info(
    '[admin] dashboard todo cards loaded',
    JSON.stringify(visibleCards.value.map((c) => ({ key: c.menuKey, count: c.count }))),
  );
};

const goToCard = (card: TodoCard) => {
  router.push({ path: card.path, query: { status: card.status } });
};

onMounted(() => {
  loadCardCounts();
});
</script>

<style scoped lang="scss">
.dashboard-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// ── 欢迎条 ────────────────────────────────────────────────────────────────────

.welcome-card {
  .welcome-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .welcome-text {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .welcome-greeting {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

  .role-tag {
    font-weight: 500;
  }

  .welcome-sub {
    font-size: 13px;
    color: #909399;
  }
}

// ── 待办卡片组 ────────────────────────────────────────────────────────────────

.todo-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.todo-card {
  cursor: pointer;
  transition: transform 0.15s;

  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &:hover {
    transform: translateY(-2px);
  }
}

.todo-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.todo-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-card-label {
  font-size: 13px;
  color: #606266;
}

.todo-card-count {
  font-size: 24px;
  font-weight: 600;
  color: #303133;

  .count-loading {
    font-size: 16px;
    color: #c0c4cc;
  }
}
</style>
