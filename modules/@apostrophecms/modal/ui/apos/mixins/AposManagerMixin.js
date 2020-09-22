// TODO: Reconcile the overlap in this mixin between the pages and pieces
// managers. Does it need to be a mixin? This may be resolved when switching to
// Vue 3 using the composition API. - AB
export default {
  data() {
    return {
      icons: {},
      checkboxes: {},
      checked: []
    };
  },
  computed: {
    headers() {
      return this.options.columns ? this.options.columns : [];
    },
    selectAllValue() {
      return this.checked.length > 0 ? { data: [ 'checked' ] } : { data: [] };
    },
    selectAllChoice() {
      const checkCount = this.checked.length;
      const itemCount = this.items.length;

      return checkCount > 0 && checkCount !== itemCount ? {
        value: 'checked',
        indeterminate: true
      } : {
        value: 'checked'
      };
    }
  },
  watch: {
    items: function(newValue) {
      if (newValue.length) {
        this.generateUi();
      }
    }
  },
  methods: {
    toggleRowCheck(id) {
      if (this.checked.includes(id)) {
        this.checked = this.checked.filter(item => item !== id);
        if (this.checkboxes[id]) {
          this.checkboxes[id].value.data = this.checkboxes[id] && [];
        }
      } else {
        this.checked.push(id);
        this.checkboxes[id].value.data = [ 'checked' ];
      }
    },
    selectAll(event) {
      if (!this.checked.length) {
        this.items.forEach((item) => {
          this.toggleRowCheck(item._id);
          this.updateSelectedItems({ target: { id: item._id } });
        });
        return;
      }

      if (this.checked.length <= this.items.length) {
        this.checked.forEach((id) => {
          this.toggleRowCheck(id);
        });
      }
    },

    iconSize(header) {
      if (header.icon) {
        if (header.icon === 'Circle') {
          return 8;
        } else {
          return 10;
        }
      }
    },

    sort(action) {
      this.$emit('sort', action);
    },
    generateUi () {
      this.generateIcons();
      this.generateCheckboxes();
    },
    generateIcons () {
      // fetch all icons used in table headers
      const icons = {};
      this.headers.forEach(h => {
        if (h.icon) {
          icons[h.icon] = `${h.icon.toLowerCase()}-icon`;
        }

        if (h.labelIcon && !icons[h.labelIcon]) {
          icons[h.labelIcon] = `${h.labelIcon.toLowerCase()}-icon`;
        }
      });
      this.icons = icons;
      // prep item checkbox fields
    },
    generateCheckboxes () {
      const checkboxes = {};
      this.items.forEach((item) => {
        checkboxes[item._id] = {
          status: {},
          value: {
            data: []
          },
          choice: { value: item._id },
          field: {
            name: item._id,
            type: 'checkbox',
            hideLabel: true,
            label: `Toggle selection of ${item.title}`,
            // TODO: Refactor this.field out to relationship manager.
            disabled: this.field && this.field.max &&
              this.checked.length >= this.field.max &&
              !this.checked.includes(item._id)
          }
        };
      });
      this.checkboxes = checkboxes;
    }
  }
};
