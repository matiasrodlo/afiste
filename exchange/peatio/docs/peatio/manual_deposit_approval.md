## Manual Deposit Approval

To make ability for admin to verify each deposit for crypto, peatio has solution to use. <br>

There is configuration named as `PEATIO_MANUAL_DEPOSIT_APPROVAL`. <br>
By default ENV value has default as `false`, but if you want to approve income transfers manually you can set this value as `true`.

#### Deposit states

Let's present deposit states with which peatio will be dealing with. <br>

There are several possible cases for different situations. <br>

First, lets check case when admin approves deposit.<br>

Deposit states will be next way:

**1. submitted** (initial deposit state) **->** **2. accepted** (API action name `accept`) **->** **3.  aml_processing** (API action name `process` ) **->** **4. processing** (API action name `process_collect`) **->** **5. collected** (API action name `dispatch`)

- on `accept` action system lock user funds
- on `process` action system check if manual approve enabled
- on `process_collect` action system unlock funds if ENV variable `PEATIO_DEPOSIT_FUNDS_LOCKED` disabled
- on `dispatch`action system unlock funds if ENV variable `PEATIO_DEPOSIT_FUNDS_LOCKED` enabled

In next case, admin identify deposit as suspicious.<br>

Deposit states will be next way:

**1. submitted** (initial deposit state) **->** **2. accepted** (API action name `accept`) **->** **3. aml_processing** (API action name `process` ) **->** **4. aml_suspicious** (API action name `aml_suspicious`)

From `aml_suspicious` there are 2 possible ways:
- make refund for user (`refund` state: API action name `refund`)
- process deposit again (`aml_processing` state: API action name `process`)
