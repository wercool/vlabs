function AktakomPowerSupply(vlab)
{
    this.vlab = vlab;
    this.isOn = false;

    this.screenMesh         = this.vlab.getVlabScene().getObjectByName("aktakomPowerSupplyScreen");
    this.screenBackMesh     = this.vlab.getVlabScene().getObjectByName("aktakomPowerSupplyScreenBack");
    this.switchMesh         = this.vlab.getVlabScene().getObjectByName("aktakomPowerSupplySwitch");

    this.voltage = 0.0;
    this.loadResistance = Infinity;

    this.voltageInstability();
}

AktakomPowerSupply.prototype.voltageInstability = function()
{
    var self = this;
    setTimeout(function(){ self.voltageInstability(); }, 500);
    //console.log(this.voltage);
};

AktakomPowerSupply.prototype.getVoltage = function()
{
    return this.voltage;
};

AktakomPowerSupply.prototype.getCurrent = function()
{
    return (this.voltage / this.loadResistance);
};
