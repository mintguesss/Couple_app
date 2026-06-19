import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// <model-viewer> 是 @google/model-viewer 註冊的 web component，補上 JSX 型別讓 .web.tsx 可以直接使用
// React 19 的 IntrinsicElements 定義在 React.JSX 這個 namespace 下，要從這裡擴充才會被 react-jsx transform 認到
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          'auto-rotate'?: boolean;
          'camera-controls'?: boolean;
          'disable-zoom'?: boolean;
          'camera-orbit'?: string;
          'shadow-intensity'?: string | number;
          'interaction-prompt'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
        };
      }
    }
  }
}
