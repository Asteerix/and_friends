declare module 'react-native-gesture-handler' {
  import { Component, ReactNode } from 'react';
  import { ViewProps } from 'react-native';

  export class GestureHandlerRootView extends Component<ViewProps & { children?: ReactNode }> {}
  export class TapGestureHandler extends Component<any> {}
  export class PanGestureHandler extends Component<any> {}
  export class PinchGestureHandler extends Component<any> {}
  export class RotationGestureHandler extends Component<any> {}
  export class LongPressGestureHandler extends Component<any> {}
  export class ForceTouchGestureHandler extends Component<any> {}
  export class FlingGestureHandler extends Component<any> {}
  export class RawButton extends Component<any> {}
  export class BaseButton extends Component<any> {}
  export class RectButton extends Component<any> {}
  export class BorderlessButton extends Component<any> {}
  export class TouchableOpacity extends Component<any> {}
  export class TouchableHighlight extends Component<any> {}
  export class TouchableWithoutFeedback extends Component<any> {}
  export class TouchableNativeFeedback extends Component<any> {}
  export class TextInput extends Component<any> {}
  export class DrawerLayout extends Component<any> {}
  export class ScrollView extends Component<any> {}
  export class FlatList extends Component<any> {}
  export class Switch extends Component<any> {}

  export const State: any;
  export const Directions: any;
  export function gestureHandlerRootHOC(component: any): any;
}

declare module 'react-native-gesture-handler/Swipeable' {
  import { Component } from 'react';

  export default class Swipeable extends Component<any> {}
}
