# encoding: UTF-8
# frozen_string_literal: true

# Deprecated
# TODO: Delete this class and update type column
module Withdraws
  class Coin < Withdraw
    has_one :blockchain, through: :currency

    before_validation do
      next unless blockchain_api&.supports_cash_addr_format? && rid?
      self.rid = CashAddr::Converter.to_cash_address(rid) if CashAddr::Converter.is_valid?(rid)
    end

    before_validation do
      if blockchain_api.present? && blockchain_api.case_sensitive? == false
        self.rid  = rid.try(:downcase)
        self.txid = txid.try(:downcase)
      end
    end

    validate do
      if blockchain_api&.supports_cash_addr_format? && rid?
        errors.add(:rid, :invalid) unless CashAddr::Converter.is_valid?(rid)
      end
    end

    def as_json_for_event_api
      super.merge blockchain_confirmations: confirmations
    end
  end
end

# == Schema Information
# Schema version: 20210201100941
#
# Table name: withdraws
#
#  id             :integer          not null, primary key
#  member_id      :integer          not null
#  beneficiary_id :bigint
#  currency_id    :string(10)       not null
#  amount         :decimal(32, 16)  not null
#  fee            :decimal(32, 16)  not null
#  txid           :string(128)
#  aasm_state     :string(30)       not null
#  block_number   :integer
#  sum            :decimal(32, 16)  not null
#  type           :string(30)       not null
#  transfer_type  :integer
#  tid            :string(64)       not null
#  rid            :string(256)      not null
#  note           :string(256)
#  metadata       :json
#  error          :json
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  completed_at   :datetime
#
# Indexes
#
#  index_withdraws_on_aasm_state            (aasm_state)
#  index_withdraws_on_currency_id           (currency_id)
#  index_withdraws_on_currency_id_and_txid  (currency_id,txid) UNIQUE
#  index_withdraws_on_member_id             (member_id)
#  index_withdraws_on_tid                   (tid)
#  index_withdraws_on_type                  (type)
#
