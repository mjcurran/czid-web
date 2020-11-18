import React from "react";
import PropTypes from "prop-types";
import { forbidExtraProps } from "airbnb-prop-types";

const IconPhyloTreePublic = ({ className }) => {
  return (
    <svg className={className} width="32px" height="32px" viewBox="0 0 32 32">
      <path
        fill="#CCCCCC"
        d="M18.587234,21.2 L12.8680851,21.2 L12.8680851,14.8 L16.8510638,14.8 C17.2595745,16.4 18.6893617,17.5 20.3234043,17.5 C22.3659574,17.5 24,15.9 24,13.9 C24,11.9 22.3659574,10.3 20.3234043,10.3 C18.6893617,10.3 17.2595745,11.4 16.8510638,13 L12.8680851,13 L12.8680851,6.6 L16.8510638,6.6 C17.2595745,8.2 18.6893617,9.2 20.3234043,9.2 C22.3659574,9.2 24,7.6 24,5.6 C24,3.6 22.3659574,2 20.3234043,2 C18.6893617,2 17.1574468,3.2 16.8510638,4.8 L12.0510638,4.8 C12.0510638,4.8 12.0510638,4.8 12.0510638,4.8 C11.8468085,4.8 11.6425532,4.9 11.4382979,5.1 C11.2340426,5.3 11.1319149,5.5 11.1319149,5.7 L11.1319149,13 L7.14893617,13 C6.74042553,11.4 5.3106383,10.3 3.67659574,10.3 C1.63404255,10.3 0,11.9 0,13.9 L0,14 L0,14 C0.10212766,15.9 1.73617021,17.5 3.67659574,17.5 C5.3106383,17.5 6.74042553,16.4 7.14893617,14.8 L11.1319149,14.8 L11.1319149,22.1 C11.1319149,22.6 11.5404255,23 12.0510638,23 C12.0510638,23 12.0510638,23 12.0510638,23 L17.7702128,23 C17.8723404,22.3 18.1787234,21.7 18.587234,21.2 Z M20.3234043,12.1 C21.3446809,12.1 22.1617021,12.9 22.1617021,13.9 C22.1617021,14.9 21.3446809,15.8 20.3234043,15.8 C19.3021277,15.8 18.4851064,15 18.4851064,13.9 C18.3829787,12.9 19.2,12.1 20.3234043,12.1 Z M20.3234043,3.8 C21.3446809,3.8 22.1617021,4.6 22.1617021,5.7 C22.1617021,6.7 21.3446809,7.5 20.3234043,7.5 C19.3021277,7.5 18.4851064,6.7 18.4851064,5.7 C18.3829787,4.7 19.3021277,3.8 20.3234043,3.8 Z M3.57446809,15.8 C2.55319149,15.8 1.73617021,15 1.73617021,13.9 C1.73617021,12.9 2.55319149,12.1 3.57446809,12.1 C4.59574468,12.1 5.51489362,12.9 5.51489362,13.9 C5.51489362,14.9 4.59574468,15.8 3.57446809,15.8 Z"
      />
      <path
        fill="#3867FA"
        d="M25.0977461,17.028174 C20.5150261,16.6296766 16.6296766,20.5150261 17.028174,25.0977461 C17.327047,28.6842226 20.2161531,31.672953 23.9022539,31.971826 C28.4849739,32.3703234 32.3703234,28.4849739 31.971826,23.9022539 C31.672953,20.2161531 28.7838469,17.2274227 25.0977461,17.028174 Z M25.9943652,18.0244175 C26.2932382,18.1240418 26.5921113,18.2236661 26.8909843,18.3232905 C27.090233,18.4229148 27.1898574,18.5225392 27.3891061,18.5225392 C28.1861008,18.9210366 28.8834713,19.4191583 29.4812173,20.1165287 C29.4812173,20.1165287 29.5808417,20.2161531 29.5808417,20.3157774 C29.5808417,20.4154018 29.5808417,20.6146505 29.5808417,20.7142748 C29.5808417,20.8138992 29.4812173,20.9135235 29.4812173,21.0131479 C29.4812173,21.2123966 29.680466,21.3120209 29.7800904,21.3120209 C29.8797147,21.3120209 30.0789634,21.3120209 30.1785878,21.3120209 C30.2782121,21.3120209 30.3778365,21.4116452 30.3778365,21.5112696 C30.4774608,21.7105183 30.5770852,21.909767 30.5770852,22.0093913 C30.8759582,22.7067618 30.9755825,23.4041322 31.0752069,24.201127 C31.0752069,24.3007513 31.0752069,24.4003757 30.9755825,24.5 C30.8759582,24.5996243 30.6767095,24.798873 30.5770852,24.9981217 C30.3778365,25.3966191 30.1785878,25.9943652 29.8797147,26.2932382 C29.680466,26.4924869 29.4812173,26.6917356 29.4812173,26.8909843 C29.381593,27.090233 29.4812173,27.2894817 29.381593,27.3891061 C29.381593,27.4887304 29.2819687,27.4887304 29.1823443,27.3891061 C28.8834713,26.9906087 28.7838469,26.5921113 28.6842226,26.1936139 C28.5845982,25.8947409 28.5845982,25.5958678 28.4849739,25.1973704 C28.3853495,24.8984974 28.1861008,24.5996243 27.8872278,24.4003757 C27.5883548,24.201127 27.1898574,24.3007513 26.8909843,24.201127 C26.4924869,24.201127 26.1936139,24.1015026 25.8947409,23.8026296 C25.7951165,23.7030052 25.6954922,23.5037565 25.6954922,23.4041322 C25.4962435,22.6071374 25.9943652,21.7105183 26.6917356,21.3120209 C26.79136,21.2123966 26.8909843,21.2123966 26.9906087,21.1127722 C27.1898574,20.9135235 27.2894817,20.7142748 27.1898574,20.4154018 C27.1898574,20.3157774 27.090233,20.3157774 27.090233,20.3157774 C26.8909843,20.4154018 26.6917356,20.4154018 26.5921113,20.5150261 C26.4924869,20.5150261 26.3928626,20.5150261 26.3928626,20.4154018 C26.3928626,20.1165287 26.3928626,19.8176557 26.4924869,19.4191583 C26.5921113,19.0206609 26.6917356,18.7217879 26.4924869,18.4229148 C26.4924869,18.3232905 26.3928626,18.3232905 26.2932382,18.3232905 C25.9943652,18.3232905 25.6954922,18.3232905 25.3966191,18.3232905 C25.3966191,18.3232905 25.3966191,18.3232905 25.3966191,18.3232905 C25.5958678,18.2236661 25.6954922,18.1240418 25.7951165,17.9247931 C25.8947409,18.1240418 25.9943652,18.0244175 25.9943652,18.0244175 Z M22.8063861,18.1240418 C22.9060104,18.1240418 22.9060104,18.1240418 23.0056348,18.2236661 C23.1052591,18.4229148 23.2048835,18.5225392 23.3045078,18.7217879 C23.5037565,19.1202853 23.6033809,19.618407 23.4041322,19.91728 C23.2048835,20.3157774 22.7067618,20.5150261 22.3082644,20.8138992 C21.4116452,21.2123966 20.7142748,21.909767 20.2161531,22.7067618 C20.2161531,22.7067618 20.1165287,22.8063861 20.1165287,22.8063861 C20.0169044,22.8063861 20.0169044,22.8063861 19.91728,22.7067618 C19.8176557,22.6071374 19.7180313,22.6071374 19.618407,22.5075131 C19.618407,22.5075131 19.5187827,22.5075131 19.5187827,22.6071374 C19.4191583,23.0056348 19.618407,23.5037565 20.0169044,23.7030052 C20.1165287,23.7030052 20.1165287,23.8026296 20.2161531,23.8026296 C20.3157774,24.0018783 20.2161531,24.201127 20.2161531,24.4003757 C20.2161531,24.6992487 20.6146505,24.798873 20.8138992,24.798873 C21.1127722,24.798873 21.3120209,24.5996243 21.6108939,24.5 C22.20864,24.3007513 22.8063861,24.4003757 23.3045078,24.6992487 C23.6033809,24.8984974 23.8026296,25.0977461 24.0018783,25.2969948 C24.201127,25.4962435 24.5,25.5958678 24.798873,25.5958678 C24.8984974,25.5958678 24.8984974,25.5958678 24.9981217,25.6954922 C25.0977461,25.9943652 24.9981217,26.2932382 24.798873,26.4924869 C24.5996243,26.79136 24.3007513,26.8909843 24.1015026,27.1898574 C23.6033809,27.7876034 23.4041322,28.6842226 23.0056348,29.381593 C22.9060104,29.4812173 22.8063861,29.680466 22.7067618,29.7800904 C22.6071374,29.9793391 22.6071374,30.1785878 22.6071374,30.4774608 C22.6071374,30.4774608 22.6071374,30.5770852 22.5075131,30.5770852 C22.4078887,30.5770852 22.3082644,30.4774608 22.20864,30.4774608 C22.1090157,30.4774608 22.1090157,30.3778365 22.1090157,30.2782121 C21.909767,29.381593 21.6108939,28.4849739 21.2123966,27.5883548 C21.0131479,27.2894817 20.8138992,26.8909843 20.5150261,26.6917356 C20.4154018,26.5921113 20.3157774,26.5921113 20.3157774,26.4924869 C20.3157774,26.3928626 20.3157774,26.2932382 20.3157774,26.2932382 C20.4154018,25.3966191 20.0169044,24.5 19.319534,24.0018783 C19.2199096,23.9022539 19.0206609,23.8026296 19.0206609,23.7030052 C19.0206609,23.6033809 18.9210366,23.4041322 18.9210366,23.3045078 C18.8214122,23.2048835 18.6221635,23.0056348 18.5225392,22.9060104 C18.4229148,22.9060104 18.4229148,22.8063861 18.4229148,22.7067618 C18.8214122,20.6146505 20.5150261,18.7217879 22.8063861,18.1240418 Z"
      />
    </svg>
  );
};

IconPhyloTreePublic.propTypes = forbidExtraProps({
  className: PropTypes.string,
});

export default IconPhyloTreePublic;
