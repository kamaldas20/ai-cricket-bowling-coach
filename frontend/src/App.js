import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Landing from './Landing';
import Upload from './Upload';
import Results from './Results';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path='/' exact component={Landing} />
        <Route path='/upload' component={Upload} />
        <Route path='/results' component={Results} />
      </Switch>
    </Router>
  );
};

export default App;