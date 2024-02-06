import { LightningElement, wire,api,track } from 'lwc';
import getVoucherRequests from '@salesforce/apex/VoucherUtility.getRelatedVoucherRequest';
import updateVoucherRequest from '@salesforce/apex/VoucherUtility.updateVoucherRequest';
import deleteVoucherRequests from '@salesforce/apex/VoucherUtility.deleteVoucherRequests';
import submitVoucherRequests from '@salesforce/apex/VoucherUtility.submitVoucherRequests';
import { refreshApex } from '@salesforce/apex';
import { RefreshEvent } from 'lightning/refresh';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import VOUCHER_REQUESTS_OBJECT from '@salesforce/schema/Voucher_Request__c';
import VOUCHER_REQUESTS_APPROVAL_FIELD from '@salesforce/schema/Voucher_Request__c.Approval_Status__c';
import VOUCHER_REQUESTS_TYPE_FIELD from '@salesforce/schema/Voucher_Request__c.Voucher_Type__c';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';

const COLS = [
    { label: 'Voucher Name', fieldName: 'Voucher_Name__c', type: 'text', editable: true },
    {
        label: 'Type', 
        fieldName: 'Voucher_Type__c', 
        type: 'TypeColumn', 
        editable: true, 
        typeAttributes: {
            placeholder: 'Choose Type', 
            options: { fieldName: 'typePickListOptions' }, 
            value: { fieldName: 'Voucher_Type__c' }, // default value for picklist,
            context: { fieldName: 'Id' } // binding Id with context variable to be returned back
        }
    },
    { label: 'Quantity', fieldName: 'Quantity__c', type: 'currency', editable: true  },
    { label: 'Amount', fieldName: 'Amount__c', type: 'currency', editable: true  },
    { label: 'Expiry Date', fieldName: 'Expiry_Date__c', type: 'date', editable: true,  },
    {
        label: 'Service Provider',
        fieldName: 'ServiceProviders__c', //lookup API field name 
        type: 'lookupColumn',
        typeAttributes: {
            object: 'Voucher_Request__c', //object name which have lookup field
            fieldName: 'ServiceProviders__c',  //lookup API field name 
            value: { fieldName: 'ServiceProviders__c' },  //lookup API field name 
            context: { fieldName: 'Id' }, 
            name: 'Service_Providers__c',  //lookup object API Name 
            fields: ['Service_Providers__c.Provider_Name__c'], //lookup objectAPIName.Name
            target: '_self'
        },
        editable: false,
    },
    {
        label: 'Goods & Services',
        fieldName: 'VouchersRequest__c', //lookup API field name 
        type: 'reusableMultiSelectLookupColumn',
        editable: false,
        initialWidth: 250,
    },
    {
        label: 'Approval Status', 
        fieldName: 'Approval_Status__c', 
        type: 'ApprovalStatusColumn', 
        editable: true, 
        typeAttributes: {
            placeholder: 'Choose Status', 
            options: { fieldName: 'approvalProcessPickListOptions' }, 
            value: { fieldName: 'Approval_Status__c' }, // default value for picklist,
            context: { fieldName: 'Id' } // binding Id with context variable to be returned back
        }
    }
];
const COLSFORAPPROVED = [
    { label: 'Voucher Name', fieldName: 'Voucher_Name__c', type: 'text',  editable: false },
    {
        label: 'Type', 
        fieldName: 'Voucher_Type__c', 
        type: 'TypeColumn', 
        editable: false,
        typeAttributes: {
            placeholder: 'Choose Type', 
            options: { fieldName: 'typePickListOptions' }, 
            value: { fieldName: 'Voucher_Type__c' }, // default value for picklist,
            context: { fieldName: 'Id' } // binding Id with context variable to be returned back
        }
    },
    { label: 'Quantity', fieldName: 'Quantity__c', type: 'currency', editable: false  },
    { label: 'Amount', fieldName: 'Amount__c', type: 'currency', editable: false  },
    { label: 'Expiry Date', fieldName: 'Expiry_Date__c', type: 'date', editable: false  },
    {
        label: 'Service Provider',
        fieldName: 'ServiceProviders__c', //lookup API field name 
        type: 'lookupColumnForApproval',
        typeAttributes: {
            object: 'Voucher_Request__c', //object name which have lookup field
            fieldName: 'ServiceProviders__c',  //lookup API field name 
            value: { fieldName: 'ServiceProviders__c' },  //lookup API field name 
            context: { fieldName: 'Id' }, 
            name: 'Service_Providers__c',  //lookup object API Name 
            fields: ['Service_Providers__c.Provider_Name__c'], //lookup objectAPIName.Name
            target: '_self'
        },
        editable: false,
    },
    {
        label: 'Goods & Services',
        fieldName: 'VouchersRequest__c', //lookup API field name 
        type: 'reusableMultiSelectLookupColumn',
        editable: false,
        initialWidth: 250,
    },
    {
        label: 'Approval Status', 
        fieldName: 'Approval_Status__c', 
        type: 'ApprovalStatusColumn', 
        editable: true, 
        typeAttributes: {
            placeholder: 'Choose Status', 
            options: { fieldName: 'approvalProcessPickListOptions' }, 
            value: { fieldName: 'Approval_Status__c' }, // default value for picklist,
            context: { fieldName: 'Id' } // binding Id with context variable to be returned back
        }
    }
];
export default class DatatableInlineEditWithApex extends LightningElement {
    columns = COLS;
    columnsForApproval = COLSFORAPPROVED;
    @track draftValues = [];
    @api recordId;//we can get the id from the button
    @track approvalProcessPickListOptions;
    @track typePickListOptions;
    @track data;
    @track voucherRequestData;
    @track pendingList;
    @track isHovered = false;
    lastSavedData = [];
    selectedRows = [];
    error;
    lstDeletedRecords;
    isCreateVoucherRequest = false;

    connectedCallback(){
        //console.log('this.recordId ' + JSON.stringify(this.recordId));
    }
    //Show add button
    get showButtonOrDataTable(){
        if(this.data || this.pendingList){
            //console.log("this.data:::" + JSON.stringify(this.data));
            //console.log("this.pendingList:::" + JSON.stringify(this.pendingList));
            return true;
        }
        return false;
    }
    //Get Object
    @wire(getObjectInfo, { objectApiName: VOUCHER_REQUESTS_OBJECT })
    objectInfo;
 
    //fetch picklist options for approval status
    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: VOUCHER_REQUESTS_APPROVAL_FIELD
    })wirePickList({ error, data }) {
        if (data) {
            this.approvalProcessPickListOptions = data.values;
            //console.log(data);
        } else if (error) {
            //console.log(error);
            this.error=error;
        }
    }
        //fetch picklist options for type
        @wire(getPicklistValues, {
            recordTypeId: '$objectInfo.data.defaultRecordTypeId',
            fieldApiName: VOUCHER_REQUESTS_TYPE_FIELD
        })wirePickListType({ error, data }) {
            if (data) {
                this.typePickListOptions = data.values;
                //console.log(data);
            } else if (error) {
                //console.log(error);
                this.error=error;
            }
        }
     //here I pass picklist option so that this wire method call after above method
    @wire(getVoucherRequests,{ campaignId : '$recordId',
                                approvalList: '$approvalProcessPickListOptions'
                            })
    voucherRequests(result) {
        let pendingList = [];
        let allList = [];
        this.voucherRequestData = result;
        if (result.data) {
            this.data = JSON.parse(JSON.stringify(result.data));
            //console.log('Before piclist: ' + JSON.stringify(this.data));
            this.data.forEach(ele => {
                ele.approvalProcessPickListOptions = this.approvalProcessPickListOptions;
                ele.typePickListOptions = this.typePickListOptions;
            })
            this.data.forEach(item => {
                if (item.Approval_Status__c === 'Pending Approval') {
                    // If Approval_Status__c is "Pending Approval", add to pendingList
                    pendingList.push(item);
                } else {
                    // If not, add to allList
                    allList.push(item);
                }
            });
            this.pendingList = pendingList.length !=0 ? pendingList : undefined;
            this.data = allList;
            //console.log('pendingList:' + JSON.stringify(this.pendingList));
            this.lastSavedData = JSON.parse(JSON.stringify(this.data));
            this.data =  this.data.length == 0 ? undefined : this.data;

        } else if (result.error) {
            this.data = undefined;
            //console.log(result.error);
            this.error=result.error;
            //Add error screen
        }
    };

    //Im gonna check this method later
    // processData(data) {
    //     // Example: Make entire rows read-only based on the condition that Amount is greater than 1000
    //     return data.map(item => ({
    //         ...item,
    //         readonly: item.Approval_Status__c == 'Pending Approval', // Add a _disabled property to make entire row read-only
    //     }));
    // }

        //handler to handle cell changes & update values in draft values
        handleCellChange(event) {
            this.updateDraftValues(event.detail.draftValues[0]);
            //console.log("Last Changed >>> " + JSON.stringify(event.detail.draftValues[0]));
            const expiryDate = new Date(event.detail.draftValues[0].Expiry_Date__c);
            const voucherRequestType = event.detail.draftValues[0].Voucher_Type__c;
            if(expiryDate <= new Date()){
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Expiry Date',
                        message: 'Expiry Date must be in the future',
                        variant: 'error',
                        mode:'sticky'
                    })
                );
            }
            if(voucherRequestType == 'Monetary'){
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Voucher Request Type',
                        message: 'You chose Monetary, so it means you cant choose Goods & Services.',
                        variant: 'warning',
                        mode:'sticky'
                    })
                );
            }
            if(voucherRequestType == 'Goods & Services'){
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Voucher Request Type',
                        message: 'You chose Goods & Services,Please add Goods & Services',
                        variant: 'info',
                        mode:'sticky'
                    })
                );
            }
        }

        updateDraftValues(updateItem) {
            let draftValueChanged = false;
            let copyDraftValues = [...this.draftValues];
            //store changed value to do operations
            //on save. This will enable inline editing &
            //show standard cancel & save button
            copyDraftValues.forEach(item => {
                if (item.Id === updateItem.Id) {
                    for (let field in updateItem) {
                        item[field] = updateItem[field];
                    }
                    draftValueChanged = true;
                }
            });
     
            if (draftValueChanged) {
                this.draftValues = [...copyDraftValues];
                //console.log("this.draftValues " + JSON.stringify(this.draftValues));
            } else {
                this.draftValues = [...copyDraftValues, updateItem];
                //console.log("this.draftValues " + JSON.stringify(this.draftValues));
            }
        }

        handleCancel(event) {
            //remove draftValues & revert data changes
            this.data = JSON.parse(JSON.stringify(this.lastSavedData));
        }

        handleRowSelection(event) {
            // Update the selectedRows array when rows are selected/deselected
            this.selectedRows = event.detail.selectedRows;
        }
        get isDeleteButtonDisable() {
            return this.selectedRows && this.selectedRows.length > 0 ? false : true;
        }

        handleMouseOver() {
            this.isHovered = true;
        }
    
        handleMouseOut() {
            this.isHovered = false;
        }

        //listener handler to get the context and data
        //updates datatable, here I used AccountId you can use your look field API name
        lookupChanged(event) {
            //console.log(event.detail.data);
            event.stopPropagation();
            let dataRecieved = event.detail.data;
            let serviceIdVal = dataRecieved.value != undefined ? dataRecieved.value : null;
            let updatedItem = { Id: dataRecieved.context, ServiceProviders__c: serviceIdVal  };
            //console.log(updatedItem);
            this.updateDraftValues(updatedItem);
            this.updateDataValues(updatedItem);
        }

        multipleLookupChanged(event){
            //console.log("multipleLookupChange");
            //console.log("event.detail" + JSON.stringify(event.detail));

        }
        updateDataValues(updateItem) {
            let copyData = JSON.parse(JSON.stringify(this.data));
     
            copyData.forEach(item => {
                if (item.Id === updateItem.Id) {
                    for (let field in updateItem) {
                        item[field] = updateItem[field];
                    }
                }
            });
     
            //write changes back to original data
            this.data = [...copyData];
        }

        async handleSave(event) {
        const updatedFields = this.draftValues;
        //console.log("this.draftValues " + JSON.stringify(this.draftValues));
        // Clear all datatable draft values
        //this.draftValues = [];

            try {
                // Pass edited fields to the updateVoucherRequest Apex controller
                await updateVoucherRequest({ voucherRequestForUpdate: updatedFields });

                // Report success with a toast, make it dynamic wtih a method and constant class for JS
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Voucher Request records succesfully updated',
                        variant: 'success',
                        mode:'sticky'
                    })
                );

                // Display fresh data in the datatable
                await refreshApex(this.data);
            } catch (error) {
                //console.log(error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error while updating or refreshing records',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            }
    }
    getSelectedRec() {
        this.isCreateVoucherRequest = true;
        var selectedRecords =  this.template.querySelector("c-custom-data-types").getSelectedRows();
        if(selectedRecords.length > 0){
           
            let ids = '';
          selectedRecords.forEach(currentItem => {
              ids = ids + ',' + currentItem.Id;
          });
          this.selectedIds = ids.replace(/^,/, '');
          this.lstSelectedRecords = selectedRecords;
          //console.log('selectedRecords are ', this.lstSelectedRecords);
        }
           
      }

      closeHandler(){
        this.isCreateVoucherRequest = false;
    }

      deleteRecords() {
        let filteredJsonData;
        var selectedRecords =  this.template.querySelector("c-custom-data-types").getSelectedRows();
        if(selectedRecords.length > 0){
        let ids = '';
          selectedRecords.forEach(currentItem => {
              ids = ids + ',' + currentItem.Id;
        });
          this.selectedIds = ids.replace(/^,/, '');
          this.lstDeletedRecords = selectedRecords;
          console.log('selectedRecords are ', this.selectedIds);
          deleteVoucherRequests({ recordIds: this.selectedIds })
                .then(result =>{
                        // Handle successful deletion
                        console.log('Records deleted successfully:'+ result);
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Success',
                                message: 'Voucher Request records succesfully updated',
                                variant: 'success',
                                mode:'sticky'
                            })
                        );
                        //this.dispatchEvent(new RefreshEvent());
                        setTimeout(() => {
                            location.reload();
                        }, 2000); 
                        // Display fresh data in the datatable
                        //    refreshApex(this.filteredJsonData);
                })
                .catch(error => {
                    console.log(error);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error while updating or refreshing records',
                            message: error.body.message,
                            variant: 'error'
                        })
                    );
                })
        }else{
            //Please add a error message here
        }   
    }

    submitForApprovalHandler(){
        const idList = this.data.map(voucher => voucher.Id);
        //console.log('list to be sent for approval ', JSON.stringify(idList));

        submitVoucherRequests({ recordIds: idList })
            .then(result =>{
                    // Handle successful deletion
                    //console.log('Records submitted successfully:', result);
                    // Display fresh data in the datatable
                    //refreshApex(this.data);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Voucher Request records succesfully sent for Approval',
                            variant: 'success',
                            mode:'sticky'
                        })
                    );
                    setTimeout(() => {
                        location.reload();
                    }, 2000); 
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error while sending records',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            })
                //console.log(error);
    }
}