<template>
  <router-link
    :to="to"
    class="heyfred-logo"
    :class="{ 'heyfred-logo--large': large }"
    aria-label="HeyFred, home"
  >
    <span class="heyfred-logo__symbol">
      <img src="/fred-app-icon-v2.png" alt="" />
    </span>
    <span class="heyfred-logo__label" :class="{ 'heyfred-logo__label--light': light }">
      HeyFred<span class="heyfred-logo__dot">.</span>
    </span>
  </router-link>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "HeyFredLogo",
  props: {
    to: { type: String, default: "/" },
    light: { type: Boolean, default: false },
    large: { type: Boolean, default: false },
  },
});
</script>

<style scoped>
.heyfred-logo {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: "Fustat", Arial, sans-serif;
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -1px;
  color: var(--heyfred-ink);
  text-decoration: none;
  flex-shrink: 0;
}
.heyfred-logo__symbol {
  display: block;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #ece7e2;
  border-radius: 22%;
  overflow: hidden;
}
.heyfred-logo__symbol img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.heyfred-logo--large {
  font-size: 32px;
  gap: 10px;
}
.heyfred-logo--large .heyfred-logo__symbol {
  width: 44px;
  height: 44px;
}
.heyfred-logo__label--light {
  color: #fff5eb;
}
.heyfred-logo__dot {
  color: var(--heyfred-dot);
}
</style>
