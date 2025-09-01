declare module 'react-native-svg' {
  import { Component, ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
    color?: string;
    title?: string;
  }

  export class Svg extends Component<SvgProps> {}
  export class Circle extends Component<any> {}
  export class Ellipse extends Component<any> {}
  export class G extends Component<any> {}
  export class Text extends Component<any> {}
  export class TSpan extends Component<any> {}
  export class TextPath extends Component<any> {}
  export class Path extends Component<any> {}
  export class Polygon extends Component<any> {}
  export class Polyline extends Component<any> {}
  export class Line extends Component<any> {}
  export class Rect extends Component<any> {}
  export class Use extends Component<any> {}
  export class Image extends Component<any> {}
  export class Symbol extends Component<any> {}
  export class Defs extends Component<any> {}
  export class LinearGradient extends Component<any> {}
  export class RadialGradient extends Component<any> {}
  export class Stop extends Component<any> {}
  export class ClipPath extends Component<any> {}
  export class Pattern extends Component<any> {}
  export class Mask extends Component<any> {}

  export default Svg;
}
