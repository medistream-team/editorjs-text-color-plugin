import './components/xy-popover.js';
import MARKER from '../picker/components/icon';
import {
    handleCSSVariables,
    setDefaultColorCache,
    getDefaultColorCache,
    throttle,
    getCustomColorCache,
    setCustomColorCache
} from './utils/main';
const ColorCollections = ['rgb(23,43,77)', 'rgb(7,71,166)', 'rgb(0,141,166)', 'rgb(0,102,68)', 'rgb(255,153,31)', 'rgb(191,38,0)', 'rgb(64,50,148)', 'rgb(151,160,175)', 'rgb(76,154,255)', 'rgb(0,184,217)', 'rgb(54,179,126)', 'rgb(255,196,0)', 'rgb(255,86,48)', 'rgb(101,84,192)', 'rgb(255,255,255)', 'rgb(179,212,255)', 'rgb(179,245,255)', 'rgb(171,245,209)', 'rgb(255,240,179)', 'rgb(255,189,173)', 'rgb(234,230,255)']
class ColorPlugin extends HTMLElement {

    static get observedAttributes() { return ['disabled','dir'] }

    constructor(options) {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        this.colorCollections = options.colorCollections || ColorCollections;
        this.onColorPicked = options.onColorPicked;
        this.defaulColor = handleCSSVariables(options.defaultColor || this.colorCollections[0]);
        this.pluginType = options.type;
        this.hasCustomPicker = options.hasCustomPicker;
        this.customColor = getCustomColorCache(this.pluginType);

        shadowRoot.innerHTML = `
        <style>
        :host([block]){
            display:block;
        }
        :host([disabled]){
            pointer-events:none;
        }

        :host(:focus-within) xy-popover,:host(:hover) xy-popover{
            z-index: 2;
        }
        input[type="color"]{
            -webkit-appearance: none;
            outline: none;
            border: none;
        }
        xy-popover{
            width:100%;
            height:100%;
            padding: 4px;
        }
        .color-btn:hover {
            opacity: 1;
            z-index: auto;
        }
        xy-popover{
            display:block;
        }
        xy-popcon{
            position: fixed;
            min-width:100%;
        }
        #custom-picker {
            position: relative;
            top: -1px;
            background-color: rgb(250, 250, 250);
            border-color: rgb(255 118 21) rgb(245 80 80 / 74%) #89c1c9 #95d5b6;
            border-width: 3px;
            border-radius: 8px;
            height: 18px;
        }
        .pop-footer{
            display:flex;
            justify-content:flex-end;
            padding:0 .8em .8em;
        }
        .pop-footer xy-button{
            font-size: .8em;
            margin-left: .8em;
        }
        .color-sign {
           max-width: calc((27px + 10px) * 7);
           padding: 10px;
           display:grid;
           cursor: default;
           grid-template-columns: repeat(auto-fit, minmax(27px, 1fr));
           grid-gap: 10px;
        }
        .color-sign>button {
            position: relative;
            width: 27px;
            height: 27px;
            border: 1px solid rgba(179,212,255,.6);
            border-radius: 2px;
            box-sizing: border-box;
            margin: 0;
            opacity: 0.9;
        }
        .color-sign>button:hover {
            cursor: pointer;
            opacity: 1;
        }
        .color-section {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .color-fire-btn {
            font-size: 17px;
            font-weight: bold;
            text-shadow: 2px 0 0 #cab9b9;
            border-radius: 5px 0 0 5px;
        }
        .color-fire-btn-text {
            margin-right: 2px;
        }
        </style>
        <section class="color-section">
            <xy-popover id="popover" ${this.dir ? "dir='" + this.dir + "'" : ""}>
                <xy-button class="color-btn" id="color-btn" ${this.disabled ? "disabled" : ""}>
                    <div class="color-fire-btn" id="color-fire-btn">
                        ${this.pluginType === 'marker' ? MARKER : '<div class="color-fire-btn-text">A</div>' }
                    </div>
                </xy-button>
                <xy-popcon id="popcon">
                    <div class="color-sign" id="colors">
                        ${this.hasCustomPicker && (`<button id="custom-picker" class="rainbow-mask"/>`) || ''}
                        ${this.colorCollections.map(el => '<button style="background-color:' + el + '" data-color=' + el + '></button>').join('')}
                    </div>
                </xy-popcon>
            </xy-popover>
        </section>`;
    }

    focus() {
        this.colorBtn.focus();
    }

    connectedCallback() {
        this.popover = this.shadowRoot.getElementById('popover');
        this.popcon = this.shadowRoot.getElementById('popcon');
        this.colorBtn = this.shadowRoot.getElementById('color-btn');
        this.colors = this.shadowRoot.getElementById('colors');
        this.colors.addEventListener('click',(ev) => {
            const item = ev.target.closest('button');
            if (item && item.id !== 'custom-picker') {
                this.nativeclick = true;
                this.value = handleCSSVariables(item.dataset.color);
                this.onColorPicked(this.value);
            }
        });
        if (this.hasCustomPicker) {
            this.setupCustomPicker();
        }
        this.value = this.defaultvalue;
    }

    disconnectedCallback() {
        if (this.pickerInput) {
            document.body.removeChild(this.pickerInput);
        }
    }

    setupCustomPicker() {
        let isCustomPickerPseudoClick = false;
        this.customPicker = this.shadowRoot.getElementById('custom-picker');
        const customPicker = this.customPicker;
        customPicker.style.backgroundColor = this.customColor;
        this.customPicker.addEventListener('click', (ev) => {
            if (isCustomPickerPseudoClick) {
                isCustomPickerPseudoClick = false;
                return;
            }
            if (this.pickerInput) {
                document.body.removeChild(this.pickerInput);
            }
            this.pickerInput = document.createElement('input');
            const pickerInput = this.pickerInput;
            const rect = this.popcon.getBoundingClientRect();
            pickerInput.setAttribute('type', 'color');
            pickerInput.value = this.customColor;
            pickerInput.style.position = 'fixed';
            pickerInput.style.left = `${rect.x + 3}px`;
            pickerInput.style.top = `${rect.y + 10}px`;
            pickerInput.style.pointerEvents = 'none';
            pickerInput.style.zIndex = '999';
            pickerInput.style.opacity = '0';
            pickerInput.addEventListener('input', throttle(ev => {
                this.nativeclick = true;
                this.value = handleCSSVariables(ev.target.value);
                this.onColorPicked(this.value);
                setCustomColorCache(this.value, this.pluginType);

                customPicker.style.backgroundColor = this.value;

                isCustomPickerPseudoClick = true;
                customPicker.click();
            }, 30))
            document.body.appendChild(pickerInput);
            setTimeout(() => {
                pickerInput.focus();
                pickerInput.click();
            }, 0);
        });
    }

    get defaultvalue() {
        return this.defaulColor;
    }

    get value() {
        return this.$value;
    }

    get type() {
        return this.getAttribute('type');
    }

    get disabled() {
        return this.getAttribute('disabled') !== null;
    }

    get dir() {
        return this.getAttribute('dir');
    }

    set dir(value){
        this.setAttribute('dir', value);
    }

    set disabled(value) {
        if (value === null || value === false) {
            this.removeAttribute('disabled');
        } else {
            this.setAttribute('disabled', '');
        }
    }

    set defaultvalue(value){
        this.setAttribute('defaultvalue', value);
    }

    set value(value) {
        if (!value) return;
        this.$value = value;
        this.colorBtn.style.setProperty(
            '--themeColor',
            this.nativeclick
                ? setDefaultColorCache(value, this.pluginType)
                : getDefaultColorCache(value, this.pluginType)
        );
        if (this.nativeclick) {
            this.nativeclick = false;
            this.dispatchEvent(new CustomEvent('change', {
                detail: {
                    value: this.value,
                }
            }));
        } else {
            if (this.colorPane) {
                this.colorPane.value = this.value;
            } else {
                this.defaultvalue = this.value;
            }
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'disabled' && this.colorBtn) {
            if (newValue != null) {
                this.colorBtn.setAttribute('disabled', 'disabled');
            } else {
                this.colorBtn.removeAttribute('disabled');
            }
        }
        if (name == 'dir' && this.popover) {
            if (newValue != null) {
                this.popover.dir = newValue;
            }
        }
    }
}

if (!customElements.get('xy-color-picker')) {
    customElements.define('xy-color-picker', ColorPlugin);
}

export {
    ColorPlugin,
}
