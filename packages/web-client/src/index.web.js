import { AppRegistry } from 'react-native';

const Main = () => <div>Hello World !</div>;

AppRegistry.registerComponent('Main', () => Main);

AppRegistry.runApplication('Main', {
  rootTag: document.getElementById('root'),
});
