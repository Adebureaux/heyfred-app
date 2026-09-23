<template>
  <q-page>
    <div class="overview-hero">
      <div class="overview-hero-copy">
        <div class="eyebrow">Your prospecting butler</div>
        <h1>Hello, {{ authStore.user?.name }}.</h1>
        <p>The right opportunities, in the right place.<br />Fred sets the stage. Your move.</p>
        <q-btn
          class="primary-action"
          color="primary"
          icon="add"
          label="Create a list"
          to="/prospects/new"
        />
      </div>
      <div class="overview-hero-art">
        <span class="overview-hero-orbit" />
        <img src="/fred-welcome-v1.png" width="1536" height="1024" alt="" />
        <span class="overview-fred-caption">Fred, at your service.</span>
      </div>
    </div>

    <div class="text-caption text-grey q-mt-md">
      Backend status: <strong>{{ status }}</strong>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { api } from "boot/axios";
import { useAuthStore } from "stores/auth";

export default defineComponent({
  name: "IndexPage",
  setup() { 
    const authStore = useAuthStore();
    const status = ref("checking...");

    onMounted(async () => {
      try {
        const { data } = await api.get("/health");
        status.value = data.status;
      } catch (err) {
        status.value = "unreachable";
      }
    });

    return { authStore, status };
  },
});
</script>

<style scoped>
.overview-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 277px;
  background: radial-gradient(ellipse 50% 115% at 97% 100%, #df823f9e, #a04c283d 66%, transparent),
    #191410;
  border: 1px solid #4b332155;
  border-radius: 20px;
  padding: 32px;
}
.overview-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(#ffca9517 1px, transparent 1px);
  background-size: 16px 16px;
  mask-image: linear-gradient(90deg, transparent 30%, #000);
}
.overview-hero-copy {
  position: relative;
  z-index: 2;
  width: 65%;
}
.overview-hero .eyebrow {
  color: #d9a47a;
  font-size: 9px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.overview-hero h1 {
  color: #fff5eb;
  font-size: clamp(28px, 3vw, 39px);
  margin: 12px 0 0;
  font-weight: 500;
  letter-spacing: -1.2px;
  overflow-wrap: anywhere;
}
.overview-hero p {
  color: #d1bbaa;
  font-size: 14px;
  line-height: 1.8;
  margin-top: 13px;
}
.overview-hero .primary-action {
  margin-top: 22px;
  height: 39px;
  font-size: 12px;
}
.overview-hero-art {
  position: absolute;
  width: 39%;
  right: -5px;
  bottom: 0;
  height: 100%;
  pointer-events: none;
}
.overview-hero-art > img {
  position: absolute;
  width: 450px;
  max-width: none;
  height: auto;
  bottom: -24px;
  left: calc(50% - 235px);
}
.overview-hero-orbit {
  position: absolute;
  border: 1px solid #ffbd7330;
  border-radius: 50%;
  width: 310px;
  height: 310px;
  top: 20px;
  left: -9px;
}
.overview-hero-orbit::after {
  content: "";
  position: absolute;
  inset: 38px;
  border: 1px solid #ffbd7320;
  border-radius: 50%;
}
.overview-fred-caption {
  position: absolute;
  top: 23px;
  right: 25px;
  color: #f6ccab;
  background: #4a2c186e;
  border: 1px solid #d39b613b;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 18px;
  transform: rotate(5deg);
}

@media (max-width: 1100px) {
  .overview-hero-art > img {
    width: 380px;
    left: calc(50% - 205px);
    bottom: -6px;
  }
  .overview-fred-caption {
    right: 18px;
    font-size: 8px;
  }
}

@media (max-width: 767px) {
  .overview-hero {
    padding: 26px 23px 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    border-radius: 17px;
  }
  .overview-hero-copy {
    width: 100%;
  }
  .overview-hero h1 {
    font-size: 31px;
  }
  .overview-hero p {
    font-size: 13px;
  }
  .overview-hero .primary-action {
    margin-top: 20px;
  }
  .overview-hero-art {
    position: relative;
    height: 150px;
    width: 100%;
    margin-top: 14px;
  }
  .overview-hero-art > img {
    width: 305px;
    bottom: -49px;
    left: calc(50% - 163px);
  }
  .overview-hero-orbit {
    width: 260px;
    height: 260px;
    top: -10px;
    left: 5px;
  }
  .overview-fred-caption {
    font-size: 8px;
    top: 25px;
    right: -2px;
  }
}
</style>
