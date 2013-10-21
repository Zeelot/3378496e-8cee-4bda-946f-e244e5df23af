Vagrant.configure("2") do |config|
  config.vm.provider :virtualbox do |vb, override|
    override.vm.box = "precise64"
    override.vm.box_url = "http://files.vagrantup.com/precise64.box"

    vb.customize ["modifyvm", :id, "--memory", 2048]
  end

  config.vm.provider :lxc do |lxc, override|
    override.vm.box = "lxc-precise64"
    override.vm.box_url = "http://bit.ly/vagrant-lxc-precise64-2013-09-28"
  end

  config.vm.network :forwarded_port, guest: 80, host: 8081

  config.vm.synced_folder ".", "/home/vagrant/app"

  config.vm.provision :chef_solo do |chef|
    chef.cookbooks_path = "vagrant/cookbooks"
    chef.roles_path = "vagrant/roles"
    chef.add_role("app-simple-php-dev")
  end
end
