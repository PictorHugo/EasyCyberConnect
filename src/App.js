import './App.css';
import * as React from 'react';
import {Stack, Pagination, RadioGroup, FormControlLabel, Radio, List, IconButton, ListItemText, ListItem, TextField, Grid, Button} from '@mui/material';
import { ethers, utils } from "ethers";
import {follow} from "./utils";

const cyberApiUrl = 'https://api.cybertino.io/connect/'

async function getFollowStatus(from, to) {
  let postBody = {
    "query":"\n      query GetFollowStatus(\n        $fromAddr: String!\n        $toAddr: String!\n        $namespace: String\n      ) {\n        followStatus(\n          fromAddr: $fromAddr\n          toAddr: $toAddr\n          namespace: $namespace\n        ) {\n          isFollowed\n          isFollowing\n        }\n      }\n    ","variables":{"fromAddr":from,"toAddr":to}
  }
  const requestOptions = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
      // 'Refer': 'https://galaxy.eco/',
      'Origin': 'https://galaxy.eco'
    }),
    body: JSON.stringify(postBody)
  };

  let res = await fetch(cyberApiUrl, requestOptions);
  return await res.json();
}

async function fetchAndUpdateFollowStatus(entry, from) {
  let followStatus = await getFollowStatus(from, entry.address)
  entry['followStatus'] = followStatus['data']['followStatus']
}

async function listFollowers(address, firstN, after) {
  let postBody = {
    "query": "query GetIdentity($address: String!, $network: Network, $first: Int, $after: String) {\n  identity(address: $address, network: $network) {\n    address\n    ens\n     social {\n      twitter\n      __typename\n    }\n    followerCount()\n    followingCount()\n    followings(first: $first, after: $after) {\n      pageInfo {\n        ...PageInfo\n        __typename\n      }\n      list {\n        ...Connect\n        __typename\n      }\n      __typename\n    }\n    followers(first: $first, after: $after) {\n      pageInfo {\n        ...PageInfo\n        __typename\n      }\n      list {\n        ...Connect\n        __typename\n      }\n      __typename\n    }\n    friends(first: $first, after: $after, namespace: \"\") {\n      pageInfo {\n        ...PageInfo\n        __typename\n      }\n      list {\n        ...Connect\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment PageInfo on PageInfo {\n  startCursor\n  endCursor\n  hasNextPage\n  hasPreviousPage\n  __typename\n}\n\nfragment Connect on Connect {\n  address\n  ens\n  alias\n  namespace\n  __typename\n}\n",
    "variables": {
        "address": address,
        "network": "ETH",
        "first": firstN,
        "after": after
    }
  }
  const requestOptions = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
      // 'Refer': 'https://galaxy.eco/',
      'Origin': 'https://galaxy.eco'
    }),
    body: JSON.stringify(postBody)
  };

  let res = await fetch(cyberApiUrl, requestOptions);
  return await res.json();
}

async function listFollowings(address, firstN, after) {
  let postBody = {
    "query": "query GetIdentity($address: String!, $first: Int, $after: String) {\n  identity(address: $address) {\n    address\n    ens\n     social {\n      twitter\n      __typename\n    }\n    followerCount(namespace: \"\")\n    followingCount(namespace: \"\")\n    followings(first: $first, after: $after, namespace: \"\") {\n      pageInfo {\n        ...PageInfo\n        __typename\n      }\n      list {\n        ...Connect\n        __typename\n      }\n      __typename\n    }\n}\n}\n\nfragment PageInfo on PageInfo {\n  startCursor\n  endCursor\n  hasNextPage\n  hasPreviousPage\n  __typename\n}\n\nfragment Connect on Connect {\n  address\n  ens\n  alias\n  namespace\n  __typename\n}\n",
    "variables": {
        "address": address,
        "first": firstN,
        "after": after
    }
  }
  const requestOptions = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
      // 'Refer': 'https://galaxy.eco/',
      'Origin': 'https://galaxy.eco'
    }),
    body: JSON.stringify(postBody)
  };
   
  let res = await fetch(cyberApiUrl, requestOptions);
  return await res.json();
}

function App() {
  
  const QUERY_TARGET = {
    FOLLOWINGS: 'FOLLOWINGS',
    FOLLOWERS: 'FOLLOWERS',
    FRIENDS: 'FRIENDS'
  }

  const [inputValue, setInputValue] = React.useState('');
  const [currentAddress, setCurrentAddress] = React.useState('');
  const [followers, setFollowers] = React.useState({list: []});
  const [followings, setFollowings] = React.useState({list: []});
  const [friends, setFriends] = React.useState({list: []});
  const [queryTarget, setQueryTarget] = React.useState(QUERY_TARGET.FOLLOWERS);
  const [people, setPeople] = React.useState([])
  const [currentTarget, setCurrentTarget] = React.useState(QUERY_TARGET.FOLLOWERS);
  const [countOfPage, setCountOfPage] = React.useState(1);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [countOfFollowers, setCountOfFollowers] = React.useState(0);
  const [countOfFollowings, setCountOfFollowings] = React.useState(0);
  const [followButtonDisabled, setFollowButtonDisabled] = React.useState(false);
  const [searchAddress, setSearchAddress] = React.useState(false);

  React.useEffect(() => {
    const checkConnection = async () => {
      console.log("enter init function")
      handleWalletConnect()

    };
    checkConnection();
  }, []);

  const handleQueryTarget = (data) => {
    console.log(data.target.value)
    setQueryTarget(data.target.value);
  }
  const onFollowButtonClick = index => data => {
    setFollowButtonDisabled(true)
    let to = data.target.value
    console.log(index, data)
    follow(currentAddress, to).then((e) => {
      console.log("finish process")
      let status = e.data.connect.result
      if (status === "SUCCESS") {
        let sPeople = [...people]
        sPeople[index].followStatus.isFollowing = true
        setPeople(sPeople)
      }
      setFollowButtonDisabled(false)
    })
  }

  const handleChange = (data) => {
    setInputValue(data.target.value);
  }
  const handleClick = async () => {
    console.log("handleClick", inputValue)
    setCurrentTarget(queryTarget)
    setSearchAddress(inputValue)
    if (queryTarget === QUERY_TARGET.FOLLOWINGS) {
      let response = await listFollowings(inputValue, 50);
      console.log(response);
      if (response.data != null) {
        setFollowings(response.data.identity.followings);
        
        console.log(response.data.identity.followings.list);
        setPeople(response.data.identity.followings.list);
      }
    } else if (queryTarget === QUERY_TARGET.FOLLOWERS) {
      let response = await listFollowers(inputValue, 50)
      if (response.data != null) {
        setFollowers(response.data.identity.followers);
        let fetchList = [];
        response.data.identity.followers.list.map(entry => {
          entry['followStatus'] = {"isFollowed":true,"isFollowing":true}
          fetchList.push(fetchAndUpdateFollowStatus(entry, currentAddress));
        })
        await Promise.all(fetchList);
        setCountOfFollowers(response.data.identity.followerCount);
        setCountOfPage(Math.ceil(response.data.identity.followerCount/50))
        setPeople(response.data.identity.followers.list);
      }
    }
  }

  const handlePageChange = async (event, value) => {
    console.log(value)
    setCurrentPage(value)
    let after = '' + 0
    if (value > 1) {
      after = '' + (50*(value - 1) - 1)
    }
    
    if (currentTarget === QUERY_TARGET.FOLLOWINGS) {
      let response = await listFollowings(searchAddress, 50, after)
      if (response.data != null) {
        setFollowings(response.data.identity.followings);
        setPeople(response.data.identity.followings.list);
        setCountOfPage(Math.ceil(response.data.identity.followingCount/50))
      }
      
    } else if (currentTarget === QUERY_TARGET.FOLLOWERS) {
      let response = await listFollowers(inputValue, 50, after)
      if (response.data != null) {
        setFollowers(response.data.identity.followers);
        let fetchList = [];
        response.data.identity.followers.list.map(entry => {
          entry['followStatus'] = {"isFollowed":true,"isFollowing":true}
          fetchList.push(fetchAndUpdateFollowStatus(entry, currentAddress));
        })
        await Promise.all(fetchList);
        setCountOfFollowers(response.data.identity.followerCount);
        setCountOfPage(Math.ceil(response.data.identity.followerCount/50))
      }
      setPeople(response.data.identity.followers.list);
    }
  }
  
  
  const handleWalletConnect = async () => {
    if (!window.ethereum) {
        throw new Error("No new crypto wallet found")
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log("Current connected address: ", address);
    setCurrentAddress(address)
  }

  return (
    <div className="App">
      <Grid container spacing={1} direction="row">
        <Grid item xs={8}>
            <Grid m={2} display="flex" alignItems="center">
              <Grid xs={7} mr={1}>
              <TextField onChange={handleChange} label="Address" size="small" fullWidth={true}></TextField>
              </Grid>
              <Grid xs={6}>
              <RadioGroup
                row
                aria-labelledby="demo-form-control-label-placement"
                name="position"
                defaultValue={QUERY_TARGET.FOLLOWERS}
              >
                <FormControlLabel
                  // checked={queryTarget === QUERY_TARGET.FOLLOWINGS}
                  value={QUERY_TARGET.FOLLOWINGS}
                  control={<Radio />}
                  onChange={handleQueryTarget}
                  label={QUERY_TARGET.FOLLOWINGS}
                  labelPlacement="bottom"
                />
                <FormControlLabel
                  value={QUERY_TARGET.FOLLOWERS}
                  control={<Radio />}
                  onChange={handleQueryTarget}
                  label={QUERY_TARGET.FOLLOWERS}
                  labelPlacement="bottom"
                />
              </RadioGroup>
              </Grid>
              <Grid xs={2}>
                <Button onClick={handleClick} size="small" variant="outlined">Confirm</Button>
              </Grid>
              <Grid xs={2}>
                <Button onClick={handleWalletConnect} size="small" variant="outlined">Connect Wallet</Button>
              </Grid>
            </Grid>
        </Grid>
      </Grid>
      <Grid container spacing={1}>
        <Grid m={2} xs={6}>
        <List sx={{ width: '100%', maxWidth: 1000}}>
        {
          people.map((entry, index) => {
            return <ListItem
              key={entry.address}
              disableGutters
              secondaryAction={
                <Button
                  variant={
                      (currentTarget === QUERY_TARGET.FOLLOWERS && entry.followStatus.isFollowing) || (currentTarget === QUERY_TARGET.FOLLOWINGS) ? "contained" : "outlined"
                  }
                  size="small"
                  value={entry.address}
                  onClick={onFollowButtonClick(index)}
                  disabled={followButtonDisabled}
                  >
                  {
                    (currentTarget === QUERY_TARGET.FOLLOWERS && entry.followStatus.isFollowing) || (currentTarget === QUERY_TARGET.FOLLOWINGS) ? "Following" : "Follow"
                  }
                  
                </Button>
              }>
              <ListItemText primary={`${
                entry.ens === '' ? entry.address : entry.ens}`} />
            </ListItem>
          })
        }
        </List>
        </Grid>
      </Grid>
      <Grid container spacing={1}>
        <Stack spacing={2}>
          <Pagination count={countOfPage} variant="outlined" shape="rounded" page={currentPage} onChange={handlePageChange}/>
        </Stack>
      </Grid>
      
    </div>
  );
}

export default App;
